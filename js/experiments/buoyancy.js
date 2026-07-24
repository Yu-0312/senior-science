/* 浮力與阿基米德原理 Buoyancy */
(function () {
  "use strict";
  PhysicsLab.register("buoyancy", {
    build: function (root) {
      const U = PhysicsLab.util;
      const L = PhysicsLab.ui.layout(root);
      const W = 680, H = 400;
      const cv = PhysicsLab.canvas.create(L.canvasWrap, W, H);
      const ctx = cv.ctx;
      const g = 9.8;
      const tankX = 60, tankW = 380, waterY = 120, tankBot = H - 30;
      const blockW = 90, blockH = 90;

      const st = { rhoObj: 0.6, rhoLiq: 1.0, depth: 0 }; // depth: 方塊頂端相對水面(px)，正為沒入

      const sO = PhysicsLab.ui.slider({ label: "物體密度 ρ物", min: 0.2, max: 3.0, step: 0.05, value: 0.6, format: v => v.toFixed(2) + " g/cm³", onInput: v => st.rhoObj = v });
      const sLq = PhysicsLab.ui.slider({ label: "液體密度 ρ液", min: 0.5, max: 2.0, step: 0.05, value: 1.0, format: v => v.toFixed(2) + " g/cm³", onInput: v => st.rhoLiq = v });
      L.controls.appendChild(sO.el); L.controls.appendChild(sLq.el);
      const tip = document.createElement("div");
      tip.style.cssText = "font-size:11.5px;color:#62707f;line-height:1.6;margin-top:4px;";
      tip.innerHTML = "沒入比例 = ρ物 / ρ液（漂浮時）<br>ρ物 < ρ液 → 浮；ρ物 > ρ液 → 沉";
      L.controls.appendChild(tip);

      const rFb = PhysicsLab.ui.readout({ label: "浮力 Fb", unit: "N" });
      const rWt = PhysicsLab.ui.readout({ label: "重力 W", unit: "N" });
      const rFrac = PhysicsLab.ui.readout({ label: "沒入比例" });
      const rState = PhysicsLab.ui.readout({ label: "狀態" });
      [rFb, rWt, rFrac, rState].forEach(r => L.readouts.appendChild(r.el));

      function draw() {
        const floats = st.rhoObj < st.rhoLiq;
        // 目標沒入比例
        const frac = floats ? U.clamp(st.rhoObj / st.rhoLiq, 0, 1) : 1;
        // 目標方塊頂端 y
        let targetTop;
        if (floats) targetTop = waterY - blockH * (1 - frac);
        else targetTop = tankBot - blockH; // 沉底
        // 平滑移動
        const curTop = waterY - blockH * (1 - (st._frac != null ? st._frac : frac));
        st._top = st._top == null ? targetTop : U.lerp(st._top, targetTop, 0.12);
        const top = st._top;

        // 體積（以 cm³ 概念，用像素面積代表；取 V=1000 便於數值）
        const V = 1;
        const submFrac = U.clamp((waterY - top) / blockH, 0, 1) * (floats ? 1 : 1);
        const submerged = floats ? U.clamp((waterY - top) / blockH, 0, 1) : 1;
        const Fb = st.rhoLiq * g * submerged * V * 10; // 相對數值
        const Wt = st.rhoObj * g * V * 10;

        ctx.clearRect(0, 0, W, H);
        U.grid(ctx, W, H, 34);
        // 水槽
        ctx.strokeStyle = "#3a4655"; ctx.lineWidth = 2;
        ctx.strokeRect(tankX, 40, tankW, tankBot - 40);
        // 水
        ctx.fillStyle = "rgba(77,159,255,0.18)"; ctx.fillRect(tankX, waterY, tankW, tankBot - waterY);
        ctx.strokeStyle = "#4d9fff"; ctx.beginPath(); ctx.moveTo(tankX, waterY); ctx.lineTo(tankX + tankW, waterY); ctx.stroke();
        ctx.fillStyle = "#4d9fff"; ctx.font = "11px system-ui"; ctx.fillText("水面", tankX + tankW - 34, waterY - 6);

        // 方塊
        const bx = tankX + tankW / 2 - blockW / 2;
        const shade = U.clamp(st.rhoObj / 3, 0.15, 0.9);
        ctx.fillStyle = "rgba(255,180,90," + (0.4 + shade * 0.5) + ")";
        ctx.fillRect(bx, top, blockW, blockH);
        ctx.strokeStyle = "#ffcc66"; ctx.lineWidth = 1.5; ctx.strokeRect(bx, top, blockW, blockH);
        ctx.fillStyle = "#1a1200"; ctx.font = "12px system-ui"; ctx.textAlign = "center";
        ctx.fillText("ρ=" + st.rhoObj.toFixed(2), bx + blockW / 2, top + blockH / 2 + 4); ctx.textAlign = "left";

        // 力向量
        const cxB = bx + blockW / 2;
        U.arrow(ctx, cxB, top + blockH / 2, cxB, top + blockH / 2 + Wt * 3.2, "#ff6b6b", 2.5); // 重力下
        U.arrow(ctx, cxB, top + blockH / 2, cxB, top + blockH / 2 - Fb * 3.2, "#34d3c4", 2.5); // 浮力上
        // 圖例
        ctx.font = "12px system-ui";
        ctx.fillStyle = "#34d3c4"; ctx.fillText("↑ 浮力", 460, 70);
        ctx.fillStyle = "#ff6b6b"; ctx.fillText("↓ 重力", 460, 92);

        rFb.set(U.fmt(Fb, 1)); rWt.set(U.fmt(Wt, 1));
        rFrac.set(Math.round(submerged * 100) + " %");
        rState.set(floats ? (submerged > 0.98 ? "剛好懸浮" : "漂浮") : "下沉");
      }

      const loop = PhysicsLab.loop(function () { draw(); });
      loop.start();
      return { stop: function () { loop.stop(); } };
    }
  });
})();
