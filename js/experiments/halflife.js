/* 原子核與放射性 Radioactive decay & half-life */
(function () {
  "use strict";
  PhysicsLab.register("halflife", {
    build: function (root) {
      const U = PhysicsLab.util;
      const L = PhysicsLab.ui.layout(root);
      const W = 680, H = 400;
      const cv = PhysicsLab.canvas.create(L.canvasWrap, W, H);
      const ctx = cv.ctx;
      const COLS = 20, gridX = 40, gridY = 60, cell = 15;

      const st = { half: 3, N0: 200, t: 0, running: false, nuclei: [], curve: [] };

      const sH = PhysicsLab.ui.slider({ label: "半衰期 T½", min: 1, max: 8, step: 0.5, value: 3, unit: "s", onInput: v => { st.half = v; reset(); } });
      const sN = PhysicsLab.ui.slider({ label: "初始數量 N₀", min: 100, max: 400, step: 100, value: 200, onInput: v => { st.N0 = v; reset(); } });
      L.controls.appendChild(sH.el); L.controls.appendChild(sN.el);
      const btnRow = document.createElement("div"); btnRow.className = "btn-row";
      btnRow.appendChild(PhysicsLab.ui.button("開始", () => { st.running = true; loop.start(); }, "primary"));
      btnRow.appendChild(PhysicsLab.ui.button("重設", reset));
      L.controls.appendChild(btnRow);

      const rN = PhysicsLab.ui.readout({ label: "剩餘數量" });
      const rD = PhysicsLab.ui.readout({ label: "已衰變" });
      const rT = PhysicsLab.ui.readout({ label: "經過時間", unit: "T½" });
      const rFrac = PhysicsLab.ui.readout({ label: "剩餘比例" });
      [rN, rD, rT, rFrac].forEach(r => L.readouts.appendChild(r.el));

      function reset() {
        loop.stop(); st.running = false; st.t = 0; st.curve = [];
        st.nuclei = []; for (let i = 0; i < st.N0; i++) st.nuclei.push(true);
        draw();
      }
      function remaining() { let c = 0; for (const a of st.nuclei) if (a) c++; return c; }

      function draw() {
        const rem = remaining();
        ctx.clearRect(0, 0, W, H);
        U.grid(ctx, W, H, 34);
        // 核點陣列
        for (let i = 0; i < st.nuclei.length; i++) {
          const cx = gridX + (i % COLS) * cell, cy = gridY + Math.floor(i / COLS) * cell;
          ctx.fillStyle = st.nuclei[i] ? "#4d9fff" : "rgba(255,107,107,0.35)";
          ctx.beginPath(); ctx.arc(cx, cy, 5, 0, 7); ctx.fill();
        }
        // N-t 衰變曲線
        const cx0 = 380, cy0 = H - 50, cw = 270, ch = 210;
        ctx.strokeStyle = "#26303d"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx0, cy0); ctx.lineTo(cx0, cy0 - ch); ctx.moveTo(cx0, cy0); ctx.lineTo(cx0 + cw, cy0); ctx.stroke();
        ctx.fillStyle = "#62707f"; ctx.font = "11px system-ui"; ctx.fillText("N", cx0 - 4, cy0 - ch - 6); ctx.fillText("時間", cx0 + cw - 24, cy0 + 14);
        // 半衰期格線
        for (let k = 1; k <= 4; k++) {
          const y = cy0 - ch * Math.pow(0.5, k);
          ctx.strokeStyle = "rgba(255,255,255,0.07)"; ctx.beginPath(); ctx.moveTo(cx0, y); ctx.lineTo(cx0 + cw, y); ctx.stroke();
        }
        // 理論曲線
        ctx.strokeStyle = "rgba(52,211,196,0.4)"; ctx.lineWidth = 1.5; ctx.beginPath();
        const Tmax = st.half * 5;
        for (let i = 0; i <= 100; i++) {
          const tt = Tmax * i / 100, n = Math.pow(0.5, tt / st.half);
          const px = cx0 + cw * tt / Tmax, py = cy0 - ch * n;
          i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.stroke();
        // 實際數據點
        ctx.strokeStyle = "#ffcc66"; ctx.lineWidth = 2; ctx.beginPath();
        st.curve.forEach((pt, i) => {
          const px = cx0 + cw * Math.min(pt.t / Tmax, 1), py = cy0 - ch * pt.n;
          i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        });
        ctx.stroke();

        rN.set(rem); rD.set(st.N0 - rem);
        rT.set(U.fmt(st.t / st.half, 2));
        rFrac.set(Math.round(rem / st.N0 * 100) + " %");
      }

      const loop = PhysicsLab.loop(function (dt) {
        if (!st.running) return;
        st.t += dt;
        const pDecay = 1 - Math.pow(0.5, dt / st.half);
        for (let i = 0; i < st.nuclei.length; i++) if (st.nuclei[i] && Math.random() < pDecay) st.nuclei[i] = false;
        st.curve.push({ t: st.t, n: remaining() / st.N0 });
        if (st.t > st.half * 5) { st.running = false; loop.stop(); }
        draw();
      });

      reset();
      return { stop: function () { loop.stop(); } };
    }
  });
})();
