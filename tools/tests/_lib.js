/*
 * _lib.js — 測試共用工具
 *
 * 收斂三件每支測試都要做的事：斷言計數、繪圖錄影、實驗列舉。
 * 特別是錄影機：它踩過的坑（只錄座標不錄線寬、加總型雜湊對「對調」是盲的、
 * 只 hook PL.draw 而漏掉原生 ctx 呼叫）都寫在這裡，避免下一支測試重蹈覆轍。
 */
"use strict";

function reporter() {
  let pass = 0, fail = 0;
  return {
    ok(cond, name, detail) {
      cond ? pass += 1 : fail += 1;
      console.log((cond ? "  ✓ " : "  ✗ ") + name + (detail ? "  " + detail : ""));
      return cond;
    },
    section(t) { console.log("\n=== " + t + " ==="); },
    done() {
      console.log("\n通過 " + pass + " 項，失敗 " + fail + " 項");
      process.exit(fail ? 1 : 0);
    },
    get fail() { return fail; }
  };
}

/* 課程地圖裡「真的有互動模擬」的實驗 id */
function allIds(PL) {
  const C = window.PhysicsLabCurriculum, out = [];
  (C.modules || []).forEach(m => (m.experiments || []).forEach(e => {
    if (PL.has(e.id)) out.push(e.id);
  }));
  return out;
}

/*
 * 繪圖錄影機
 *
 * 必須在 canvas context 這一層攔截，不能只包 PL.draw.*——
 * 有不少實驗（beats、superposition…）是直接用 ctx.beginPath()/lineTo() 畫波形的。
 *
 * 文字與圖形要分開記：只有標籤上的數字變了，畫面其實沒動，
 * 那正是「看起來像靜態插圖」的情況，不能算成有反應。
 *
 * 線寬也要記：wire-resistivity 用 ctx.lineWidth 表示導線粗細，
 * 只錄座標的話會把它誤判成沒反應。
 */
const PATH_OPS = ["moveTo", "lineTo", "arc", "arcTo", "rect", "ellipse",
                  "bezierCurveTo", "quadraticCurveTo", "fillRect", "strokeRect"];
const TEXT_OPS = ["fillText", "strokeText"];

function makeRecorder() {
  let REC = null;
  function instrument(ctx) {
    if (!ctx || ctx.__rec) return;
    ctx.__rec = true;
    PATH_OPS.concat(TEXT_OPS).forEach(op => {
      const orig = ctx[op];
      if (typeof orig !== "function") return;
      const isText = TEXT_OPS.indexOf(op) >= 0;
      ctx[op] = function (...args) {
        if (REC) {
          const nums = args.filter(v => typeof v === "number" && isFinite(v))
            .map(v => Math.round(v * 2) / 2);
          /*
           * 文字要連內容一起記，不能只記座標。
           * 半衰期實驗改變 T½ 時，圖的座標軸會跟著縮放，曲線形狀完全自我相似，
           * 真正改變的只有刻度上的數字。只記座標的話兩張圖的雜湊一模一樣，
           * 一支正常的滑桿會被判成完全沒反應。
           */
          const str = isText && typeof args[0] === "string" ? "«" + args[0] + "»" : "";
          REC.push((isText ? "T" : "G") + op + str + nums.join(","));
        }
        return orig.apply(this, args);
      };
    });
    const s = ctx.stroke;
    if (typeof s === "function") {
      ctx.stroke = function (...a) {
        if (REC) REC.push("Glw" + (Math.round((this.lineWidth || 0) * 4) / 4));
        return s.apply(this, a);
      };
    }
  }
  return {
    instrument,
    capture(fn) {
      REC = [];
      try { fn(); } catch (e) { /* 讓呼叫端自己判斷空錄影代表什麼 */ }
      const out = REC; REC = null; return out;
    }
  };
}

/*
 * 順序敏感的雜湊。
 * 早期版本用「把每筆的雜湊加總」，但加法可交換：
 * coulomb 把電荷變號時兩支力箭頭剛好互換方向，加總後完全相同，
 * 於是被誤判成「拉滑桿沒反應」。物理模擬裡「對調」是最常見的變化之一，
 * 所以雜湊一定要對順序敏感。
 */
function hashFrame(arr) {
  let g = 0, t = 0;
  arr.forEach(s => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
    if (s[0] === "T") t = (Math.imul(t, 131) + h) | 0;
    else g = (Math.imul(g, 131) + h) | 0;
  });
  return g + "/" + t;
}

/* 兩段錄影裡「圖形部分」有多少比例不同 */
function geomDiff(a, b) {
  if (!a || !b || !a.length) return 0;
  const n = Math.max(a.length, b.length);
  let d = 0;
  for (let i = 0; i < n; i++) {
    const x = (a[i] || "").split("/")[0], y = (b[i] || "").split("/")[0];
    if (x !== y) d += 1;
  }
  return d / n;
}

/* 顏色度量：亮度與彩度。判斷「刺眼的白塊」要兩個都看——
   刺眼的是灰白，不是飽和的亮色（青綠、橘）。 */
function colorMetrics(c) {
  const m = /rgba?\(([^)]+)\)/.exec(c);
  let r, g, b, a = 1;
  if (m) { const p = m[1].split(",").map(Number); r = p[0]; g = p[1]; b = p[2]; if (p[3] !== undefined) a = p[3]; }
  else if (/^#/.test(String(c))) {
    let h = String(c).slice(1);
    if (h.length === 3) h = h.split("").map(x => x + x).join("");
    if (h.length === 8) { a = parseInt(h.slice(6, 8), 16) / 255; h = h.slice(0, 6); }
    if (h.length !== 6) return null;
    r = parseInt(h.slice(0, 2), 16); g = parseInt(h.slice(2, 4), 16); b = parseInt(h.slice(4, 6), 16);
  } else return null;
  if ([r, g, b].some(v => !isFinite(v))) return null;
  const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return {
    lum: 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b),
    chroma: (Math.max(r, g, b) - Math.min(r, g, b)) / 255,
    alpha: a
  };
}
const contrastRatio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/*
 * 從 style.css 解析某個選擇器底下的 CSS 變數。
 * 注意兩個踩過的坑：
 *   1. 必須先剝掉註解，否則「上面有註解的規則」會被當成選擇器的一部分而找不到。
 *   2. 必須用大括號配對移除 @media 區塊，不能用 indexOf 切——
 *      @media print 出現在 [data-theme="light"] 之前，用切的會把整組淺色變數砍掉。
 */
function cssVars(cssRaw) {
  let css = cssRaw.replace(/\/\*[\s\S]*?\*\//g, "");
  let out = "", i = 0;
  while (i < css.length) {
    const at = css.indexOf("@media", i);
    if (at < 0) { out += css.slice(i); break; }
    out += css.slice(i, at);
    let j = css.indexOf("{", at);
    if (j < 0) break;
    let depth = 1; j += 1;
    while (j < css.length && depth > 0) { if (css[j] === "{") depth++; else if (css[j] === "}") depth--; j++; }
    i = j;
  }
  css = out;
  function of(selector) {
    const vars = {};
    const re = /([^{}]+)\{([^}]*)\}/g;
    let m;
    while ((m = re.exec(css))) {
      const sels = m[1].split(",").map(s => s.trim().replace(/\s+/g, " "));
      if (sels.indexOf(selector) < 0) continue;
      let d; const dre = /(--[a-z0-9-]+)\s*:\s*([^;]+)/gi;
      while ((d = dre.exec(m[2]))) vars[d[1]] = d[2].trim();
    }
    return vars;
  }
  const dark = of(":root");
  return { dark, light: Object.assign({}, dark, of('[data-theme="light"]')), stripped: css, of };
}

/*
 * 切換主題並注入該主題的變數。
 * 一定要同時改 global.getComputedStyle——harness 在載入時就把它複製成
 * 獨立參照，只改 window.xxx 完全不會生效，會讓整組稽核測到的都是 fallback。
 * 因此這裡最後會回傳探測結果，呼叫端必須確認注入真的成功才繼續。
 */
function useTheme(PL, name, vars) {
  document.documentElement.getAttribute = k => (k === "data-theme" ? name : null);
  const stub = () => ({ getPropertyValue: p => vars[p] || "" });
  window.getComputedStyle = stub;
  global.getComputedStyle = stub;
  return PL.col("sim-bg-1", "#0a0f16");
}

module.exports = {
  reporter, allIds, makeRecorder, hashFrame, geomDiff,
  colorMetrics, contrastRatio, cssVars, useTheme
};
