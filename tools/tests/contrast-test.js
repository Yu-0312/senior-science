/*
 * contrast-test.js — 兩種主題的文字與介面對比都要達 WCAG AA
 *
 * 這支測試守的是「淺色主題整組色票被翻面」時最容易漏掉的東西：
 * 主色當文字放在白底上、白字疊在主色按鈕上，這兩種用法的對比要求不同，
 * 只調亮度很容易顧此失彼。
 */
require("./harness.js");
const fs = require("fs");
const { reporter, cssVars, colorMetrics, contrastRatio } = require("./_lib.js");
const R = reporter();
const V = cssVars(fs.readFileSync("css/style.css", "utf8"));

const AA_TEXT = 4.5;     // 一般文字
const AA_UI = 3.0;       // 大字與非文字圖形

function lum(v, vars) {
  // 只處理直接的色值；color-mix / var() 交給瀏覽器，測試不追下去
  const m = colorMetrics(v);
  return m ? m.lum : null;
}

function check(theme, vars) {
  R.section(theme === "dark" ? "深色主題" : "淺色主題");
  const bg = lum(vars["--bg"], vars);
  const panel = lum(vars["--panel-solid"], vars);
  const simbg = lum(vars["--sim-bg-1"], vars);
  const pairs = [
    ["--text", "--panel-solid", AA_TEXT, "本文 / 面板"],
    ["--text-dim", "--panel-solid", AA_TEXT, "次要文字 / 面板"],
    ["--text-faint", "--panel-solid", AA_UI, "輔助文字 / 面板"],
    ["--text", "--sim-bg-1", AA_TEXT, "本文 / 實驗台"],
    ["--accent", "--panel-solid", AA_UI, "主色當圖形 / 面板"],
    ["--accent-2", "--panel-solid", AA_UI, "輔色 / 面板"],
    ["--warn", "--panel-solid", AA_UI, "警示色 / 面板"],
    ["--danger", "--panel-solid", AA_UI, "危險色 / 面板"],
    ["--ok", "--panel-solid", AA_UI, "成功色 / 面板"]
  ];
  const bad = [];
  pairs.forEach(([fg, bgv, need, name]) => {
    const a = lum(vars[fg], vars), b = lum(vars[bgv], vars);
    if (a == null || b == null) return;
    const ratio = contrastRatio(a, b);
    if (ratio < need) bad.push(name + " " + vars[fg] + " / " + vars[bgv] + " = " + ratio.toFixed(2) + "（需 " + need + "）");
  });
  R.ok(bad.length === 0, "共 " + pairs.length + " 組色彩配對", bad.join("\n      "));

  // 白字疊在主色按鈕上
  const onAccent = lum(vars["--on-accent"] || "#ffffff", vars);
  const acc = lum(vars["--accent"], vars);
  if (onAccent != null && acc != null) {
    const r = contrastRatio(onAccent, acc);
    R.ok(r >= AA_UI, "按鈕文字 / 主色底 = " + r.toFixed(2) + "（需 " + AA_UI + "）");
  }
}

check("dark", V.dark);
check("light", V.light);

/*
 * 模組色當文字（--m-ink）：麵包屑、學段標籤、學習輸出的小標都用它。
 * CSS 用 color-mix 在淺色主題壓深（45% 模組色 + #06182a）、深色主題提亮（70% 模組色 + 白），
 * 這裡用同樣的 sRGB 線性混色重算一次，逐一確認每個模組在兩種主題都達 AA。
 * 由來：地科「太陽系與恆星」用 #8d6e63，深色底上只有 3.1:1，axe 在實驗頁抓到。
 */
R.section("模組色當文字");
{
  const hex = h => { const m = /^#([0-9a-f]{6})$/i.exec(String(h).trim()); return m ? [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16)) : null; };
  const mix = (a, b, p) => "#" + a.map((v, i) => Math.round(v * p + b[i] * (1 - p)).toString(16).padStart(2, "0")).join("");
  const L = c => colorMetrics(c).lum;
  const bgs = theme => ["--bg", "--panel-solid", "--panel-2"].map(k => V[theme][k]).filter(v => hex(v));
  const bad = [];
  (window.PhysicsLabCurriculum.modules || []).forEach(m => {
    const c = hex(m.color); if (!c) return;
    const dark = mix(c, [255, 255, 255], 0.70), light = mix(c, hex("#06182a"), 0.45);
    bgs("dark").forEach(b => { const r = contrastRatio(L(dark), L(b)); if (r < AA_TEXT) bad.push("深色 " + m.id + " " + dark + " / " + b + " = " + r.toFixed(2)); });
    bgs("light").forEach(b => { const r = contrastRatio(L(light), L(b)); if (r < AA_TEXT) bad.push("淺色 " + m.id + " " + light + " / " + b + " = " + r.toFixed(2)); });
  });
  R.ok(bad.length === 0, "每個模組的 --m-ink 在兩種主題都達 " + AA_TEXT + ":1", bad.slice(0, 6).join("\n      "));
}
R.done();
