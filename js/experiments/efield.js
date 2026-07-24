/* 電場線與等勢面 Electric field lines & equipotentials（可拖曳電荷） */
(function () {
  "use strict";
  PhysicsLab.register("efield", {
    build: function (root) {
      const U = PhysicsLab.util;
      const L = PhysicsLab.ui.layout(root);
      const W = 680, H = 400, K = 2500;
      const cv = PhysicsLab.canvas.create(L.canvasWrap, W, H);
      const ctx = cv.ctx;
      const canvas = cv.canvas;

      let charges = [{ x: 250, y: 200, q: 1 }, { x: 430, y: 200, q: -1 }];
      let fieldLines = [], contours = [], t = 0, dragging = null;

      // 控制
      const btnRow1 = document.createElement("div"); btnRow1.className = "btn-row";
      btnRow1.appendChild(PhysicsLab.ui.button("＋ 正電荷", () => addCharge(1), "primary"));
      btnRow1.appendChild(PhysicsLab.ui.button("－ 負電荷", () => addCharge(-1)));
      const btnRow2 = document.createElement("div"); btnRow2.className = "btn-row";
      btnRow2.appendChild(PhysicsLab.ui.button("清除", () => { charges = []; recompute(); }));
      L.controls.appendChild(btnRow1); L.controls.appendChild(btnRow2);
      const tip = document.createElement("div");
      tip.style.cssText = "font-size:11.5px;color:#62707f;line-height:1.6;margin-top:4px;";
      tip.innerHTML = "🖱 直接拖曳電荷可移動位置<br><span style='color:#34d3c4'>綠線</span>：電場線（正→負）<br><span style='color:#ffcc66'>黃線</span>：等勢面（等電位線）";
      L.controls.appendChild(tip);

      const rN = PhysicsLab.ui.readout({ label: "電荷數" });
      const rNet = PhysicsLab.ui.readout({ label: "淨電荷" });
      [rN, rNet].forEach(r => L.readouts.appendChild(r.el));

      function addCharge(q) {
        charges.push({ x: 120 + Math.random() * 440, y: 90 + Math.random() * 220, q: q });
        recompute();
      }

      function field(px, py) {
        let ex = 0, ey = 0;
        for (const c of charges) {
          const dx = px - c.x, dy = py - c.y;
          let r2 = dx * dx + dy * dy; if (r2 < 60) r2 = 60;
          const r = Math.sqrt(r2), inv = c.q * K / (r2 * r);
          ex += inv * dx; ey += inv * dy;
        }
        return { ex, ey };
      }
      function potential(px, py) {
        let v = 0;
        for (const c of charges) {
          const dx = px - c.x, dy = py - c.y;
          let r = Math.sqrt(dx * dx + dy * dy); if (r < 8) r = 8;
          v += c.q * K / r;
        }
        return v;
      }

      // ---- 電場線 ----
      function buildFieldLines() {
        fieldLines = [];
        const ds = 6, maxSteps = 240, seeds = 16;
        for (const c of charges) {
          const dir = c.q > 0 ? 1 : -1;
          for (let s = 0; s < seeds; s++) {
            const a = 2 * Math.PI * s / seeds;
            let px = c.x + 9 * Math.cos(a), py = c.y + 9 * Math.sin(a);
            const line = [{ x: px, y: py }];
            for (let i = 0; i < maxSteps; i++) {
              const f = field(px, py);
              const m = Math.hypot(f.ex, f.ey); if (m < 1e-4) break;
              px += dir * ds * f.ex / m; py += dir * ds * f.ey / m;
              if (px < 0 || px > W || py < 0 || py > H) { line.push({ x: px, y: py }); break; }
              let hit = false;
              for (const c2 of charges) {
                if (c2.q * dir < 0 && Math.hypot(px - c2.x, py - c2.y) < 11) { hit = true; break; }
              }
              line.push({ x: px, y: py });
              if (hit) break;
            }
            fieldLines.push(line);
          }
        }
      }

      // ---- 等勢面（marching squares）----
      function buildContours() {
        contours = [];
        if (!charges.length) return;
        const cell = 9, nx = Math.floor(W / cell), ny = Math.floor(H / cell);
        const grid = [];
        for (let i = 0; i <= nx; i++) { grid[i] = []; for (let j = 0; j <= ny; j++) grid[i][j] = potential(i * cell, j * cell); }
        const levels = [];
        [8, 16, 32, 64].forEach(v => { levels.push(v); levels.push(-v); });
        for (const lv of levels) {
          for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
            const x0 = i * cell, y0 = j * cell, x1 = x0 + cell, y1 = y0 + cell;
            const a = grid[i][j], b = grid[i + 1][j], c = grid[i + 1][j + 1], d = grid[i][j + 1];
            const pts = [];
            if ((a < lv) !== (b < lv)) pts.push([U.lerp(x0, x1, (lv - a) / (b - a)), y0]);
            if ((b < lv) !== (c < lv)) pts.push([x1, U.lerp(y0, y1, (lv - b) / (c - b))]);
            if ((c < lv) !== (d < lv)) pts.push([U.lerp(x1, x0, (lv - c) / (d - c)), y1]);
            if ((d < lv) !== (a < lv)) pts.push([x0, U.lerp(y1, y0, (lv - d) / (a - d))]);
            if (pts.length >= 2) contours.push([pts[0], pts[1]]);
          }
        }
      }

      function recompute() {
        buildFieldLines(); buildContours();
        rN.set(charges.length);
        rNet.set(charges.reduce((s, c) => s + c.q, 0) + " e");
        draw();
      }

      function draw() {
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = "#070b10"; ctx.fillRect(0, 0, W, H);
        // 等勢面
        ctx.strokeStyle = "rgba(255,204,102,0.4)"; ctx.lineWidth = 1;
        ctx.beginPath();
        for (const seg of contours) { ctx.moveTo(seg[0][0], seg[0][1]); ctx.lineTo(seg[1][0], seg[1][1]); }
        ctx.stroke();
        // 電場線
        ctx.strokeStyle = "rgba(52,211,196,0.55)"; ctx.lineWidth = 1.3;
        for (const line of fieldLines) {
          ctx.beginPath();
          for (let i = 0; i < line.length; i++) { i ? ctx.lineTo(line[i].x, line[i].y) : ctx.moveTo(line[i].x, line[i].y); }
          ctx.stroke();
        }
        // 動態方向點
        for (const line of fieldLines) {
          if (line.length < 8) continue;
          const idx = Math.floor((t * 30 + line.length * 0.5) % line.length);
          const p = line[idx];
          ctx.fillStyle = "#8ffcf0";
          ctx.beginPath(); ctx.arc(p.x, p.y, 1.6, 0, 7); ctx.fill();
        }
        // 電荷
        for (const c of charges) {
          const grd = ctx.createRadialGradient(c.x, c.y, 2, c.x, c.y, 16);
          if (c.q > 0) { grd.addColorStop(0, "#ff8a7a"); grd.addColorStop(1, "rgba(255,80,60,0)"); }
          else { grd.addColorStop(0, "#8ab6ff"); grd.addColorStop(1, "rgba(60,120,255,0)"); }
          ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(c.x, c.y, 16, 0, 7); ctx.fill();
          ctx.fillStyle = c.q > 0 ? "#ff5a44" : "#4d9fff";
          ctx.beginPath(); ctx.arc(c.x, c.y, 11, 0, 7); ctx.fill();
          ctx.fillStyle = "#fff"; ctx.font = "bold 15px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(c.q > 0 ? "＋" : "－", c.x, c.y + 1); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
        }
      }

      // ---- 拖曳 ----
      function toLocal(e) {
        const rect = canvas.getBoundingClientRect(), f = W / rect.width;
        const cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
        const cy = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
        return { x: cx * f, y: cy * f };
      }
      function down(e) {
        const p = toLocal(e);
        for (const c of charges) if (Math.hypot(p.x - c.x, p.y - c.y) < 18) { dragging = c; e.preventDefault(); return; }
      }
      function move(e) {
        if (!dragging) return;
        const p = toLocal(e);
        dragging.x = U.clamp(p.x, 10, W - 10); dragging.y = U.clamp(p.y, 10, H - 10);
        recompute(); e.preventDefault();
      }
      function up() { dragging = null; }
      canvas.addEventListener("mousedown", down); window.addEventListener("mousemove", move); window.addEventListener("mouseup", up);
      canvas.addEventListener("touchstart", down, { passive: false }); canvas.addEventListener("touchmove", move, { passive: false }); window.addEventListener("touchend", up);

      const loop = PhysicsLab.loop(function (dt) { t += dt; draw(); });
      recompute(); loop.start();
      return {
        stop: function () {
          loop.stop();
          window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); window.removeEventListener("touchend", up);
        }
      };
    }
  });
})();
