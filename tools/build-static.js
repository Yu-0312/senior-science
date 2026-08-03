#!/usr/bin/env node
/*
 * build-static.js — 產生可被搜尋引擎索引的靜態頁面
 *
 * 要解決的問題：
 * 整個網站的內容都由 JavaScript 在執行期生成，因此爬蟲抓到的首頁字面上
 * 寫著「0 個實驗主題、0 個互動模擬、搜尋結果共 0 筆」。245 個實驗的名稱、
 * 概念與公式一個字都不在 HTML 裡，等於這些內容對搜尋引擎完全不存在。
 * 一位老師 Google「單擺 測 重力加速度 模擬」永遠找不到這個網站。
 *
 * 這支腳本在部署前跑一次，產生：
 *   p/<實驗 id>.html   每個實驗一頁，含標題、概念、公式、學習重點（純 HTML）
 *   experiments.html   245 個實驗的總索引，依模組分組
 *   sitemap.xml        供搜尋引擎抓取
 *   robots.txt         依閘門狀態決定是否開放索引
 *
 * 靜態頁不是模擬本身，而是「這個實驗在講什麼」的可讀說明，
 * 頁面上再導向互動版本。這也順便解決了分享連結時對方看到什麼的問題。
 *
 * 用法：node tools/build-static.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "p");

/* ---------------------------------------------------------------------------
   載入課程資料
   curriculum 系列檔案是瀏覽器腳本，這裡用最小的 window 代墊直接執行它們，
   避免課程資料在兩個地方各維護一份而失去同步。
   --------------------------------------------------------------------------- */
function loadCurriculum() {
  const sandbox = { window: {}, document: { documentElement: {}, createElement: () => ({}) }, console };
  sandbox.window.window = sandbox.window;
  sandbox.self = sandbox.window;
  vm.createContext(sandbox);

  const files = [
    "js/site-config.js",
    "js/curriculum.js",
    "js/advanced-curriculum.js",
    "js/comprehensive-curriculum.js",
    "js/extension-registry.js",
    "js/open-curriculum.js",
    "js/school-curriculum.js"
  ];
  for (const file of files) {
    const full = path.join(ROOT, file);
    if (!fs.existsSync(full)) continue;
    // site-config.js 會碰 document.head，這裡給個空殼即可
    sandbox.document.head = { appendChild() {} };
    vm.runInContext(fs.readFileSync(full, "utf8"), sandbox, { filename: file });
  }
  return {
    curriculum: sandbox.window.PhysicsLabCurriculum,
    site: sandbox.window.PhysicsLabSite || {}
  };
}

/* ---------------------------------------------------------------------------
   工具
   --------------------------------------------------------------------------- */
const escapeHtml = s => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/*
 * 公式是 LaTeX，靜態頁不載入 MathJax，需要轉成可讀文字。
 *
 * 這裡不能用正規表示式處理 \dfrac{}{}：分子分母本身常含有大括號
 * （例如 \dfrac{4\pi^{2}}{g}），單層的 [^{}]* 會整個比對失敗，
 * 接著大括號被剝掉，T² = 4π²L/g 就會變成錯誤的 T² = 4π²gL。
 * 因此改用會數括號深度的小型解析器。
 */
const GREEK = {
  pi: "π", theta: "θ", lambda: "λ", mu: "μ", rho: "ρ", alpha: "α", beta: "β",
  gamma: "γ", Delta: "Δ", delta: "δ", omega: "ω", Omega: "Ω", varepsilon: "ε",
  epsilon: "ε", phi: "φ", sigma: "σ", tau: "τ", nu: "ν", eta: "η"
};

/* LaTeX 用空白當指令名的結尾，那個空白不是真的空格：\Delta P 應該是 ΔP */
const skipSpace = (src, i) => { while (i < src.length && src[i] === " ") i += 1; return i; };

// 從 index 位置（必須是 "{"）讀出成對的大括號內容
function readGroup(src, index) {
  if (src[index] !== "{") return null;
  let depth = 0;
  for (let i = index; i < src.length; i += 1) {
    if (src[i] === "{") depth += 1;
    else if (src[i] === "}") {
      depth -= 1;
      if (depth === 0) return { body: src.slice(index + 1, i), end: i + 1 };
    }
  }
  return null;
}

// 單一符號（不需要括號保護）
const isAtomic = s => /^[A-Za-z0-9ℏℓπθλμρσταβγδεφωνηΔΩ]+$/.test(s);

/*
 * 分式的括號規則
 * 「(4π^2)/g L」會被讀成 4π²/(gL)，意思完全相反，因此只要有一邊不是
 * 單一符號，就把整個分式再包一層括號，確保後面接東西時不會被誤讀。
 */
function fraction(a, b) {
  if (isAtomic(a) && isAtomic(b)) return a + "/" + b;
  return "(" + (isAtomic(a) ? a : "(" + a + ")") + "/" + (isAtomic(b) ? b : "(" + b + ")") + ")";
}

function plainFormula(latex) {
  const src = String(latex || "");
  let out = "";
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch !== "\\") {
      if (ch === "^" || ch === "_") {
        const group = readGroup(src, i + 1);
        if (group) { out += ch + plainFormula(group.body); i = group.end; continue; }
      }
      if (ch === "{" || ch === "}") { i += 1; continue; }
      out += ch; i += 1; continue;
    }

    const name = (src.slice(i + 1).match(/^[a-zA-Z]+/) || [""])[0];
    if (!name) { i += 2; continue; }                       // \( \) \[ \] \, \; 等
    let cursor = i + 1 + name.length;

    if (name === "dfrac" || name === "frac" || name === "tfrac") {
      const a = readGroup(src, cursor);
      const b = a ? readGroup(src, a.end) : null;
      if (a && b) {
        out += fraction(plainFormula(a.body), plainFormula(b.body));
        i = b.end; continue;
      }
    }
    if (name === "sqrt") {
      const a = readGroup(src, cursor);
      if (a) { const inner = plainFormula(a.body); out += "√" + (isAtomic(inner) ? inner : "(" + inner + ")"); i = a.end; continue; }
    }
    if (name === "text" || name === "mathrm") {
      const a = readGroup(src, cursor);
      if (a) { out += a.body; i = a.end; continue; }
    }
    if (GREEK[name]) { out += GREEK[name]; i = skipSpace(src, cursor); continue; }

    const symbols = {
      times: "×", cdot: "·", approx: "≈", Rightarrow: " ⇒ ", rightarrow: " → ",
      propto: " ∝ ", pm: "±", leq: "≤", geq: "≥", neq: "≠", ne: "≠", le: "≤", ge: "≥",
      infty: "∞", ell: "ℓ", hbar: "ℏ", partial: "∂", circ: "°", degree: "°",
      cdots: "⋯", ldots: "…", sum: "Σ", int: "∫", quad: " ", qquad: "  "
    };
    if (symbols[name] != null) { out += symbols[name]; i = skipSpace(src, cursor); continue; }

    // 函數名要保留：\tan\theta_c 掉了 tan 就變成看不懂的 θ_c
    const functions = ["sin", "cos", "tan", "cot", "sec", "csc", "ln", "log", "exp",
      "arcsin", "arccos", "arctan", "max", "min"];
    if (functions.indexOf(name) >= 0) { out += name + " "; i = skipSpace(src, cursor); continue; }

    if (name === "left" || name === "right") { i = cursor; continue; }

    i = skipSpace(src, cursor);                            // 其餘未知指令直接略過
  }
  return out.replace(/\s+/g, " ").trim();
}

function layout(o) {
  const gate = o.gated;
  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(o.title)}</title>
<meta name="description" content="${escapeHtml(o.description)}" />
${gate ? '<meta name="robots" content="noindex, nofollow" />\n' : ""}<link rel="canonical" href="${escapeHtml(o.canonical)}" />
<meta property="og:type" content="article" />
<meta property="og:title" content="${escapeHtml(o.title)}" />
<meta property="og:description" content="${escapeHtml(o.description)}" />
<meta property="og:locale" content="zh_TW" />
<meta property="og:url" content="${escapeHtml(o.canonical)}" />
<meta name="theme-color" content="#080b11" media="(prefers-color-scheme: dark)" />
<meta name="theme-color" content="#eef2f8" media="(prefers-color-scheme: light)" />
<meta name="color-scheme" content="dark light" />
<link rel="icon" type="image/svg+xml" href="${o.base}icons/icon.svg" />
<link rel="stylesheet" href="${o.base}css/style.css?v=${o.build}" />
<script>
(function () {
  try {
    var saved = JSON.parse(localStorage.getItem("pl-theme"));
    if (saved !== "light" && saved !== "dark") {
      saved = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    }
    document.documentElement.setAttribute("data-theme", saved);
  } catch (e) { document.documentElement.setAttribute("data-theme", "dark"); }
})();
</script>
${o.jsonLd ? '<script type="application/ld+json">' + JSON.stringify(o.jsonLd) + "</script>\n" : ""}</head>
<body class="static-page">
<header class="license-topbar">
  <a class="license-home" href="${o.base}index.html"><span class="license-home-mark" aria-hidden="true">PH</span>物理實驗室</a>
  <div class="license-topbar-actions">
    <a class="license-toplink" href="${o.base}experiments.html">全部實驗</a>
    <a class="license-toplink" href="${o.base}license.html">授權</a>
  </div>
</header>
<main class="license-page">
${o.body}
</main>
</body>
</html>
`;
}

/* ---------------------------------------------------------------------------
   單一實驗頁
   --------------------------------------------------------------------------- */
function experimentPage(exp, mod, moduleIndex, site, prev, next) {
  const formula = plainFormula(exp.formula);
  const description = (exp.concept || "").slice(0, 150);
  const canonical = site.siteUrl + "p/" + exp.id + ".html";
  const appUrl = "../index.html#" + encodeURIComponent(exp.id);

  const points = (exp.points || [])
    .map(p => `      <li>${escapeHtml(p)}</li>`).join("\n");

  const body = `  <p class="license-kicker">模組${escapeHtml(mod.no)} · ${escapeHtml(mod.title)}</p>
  <h1>${escapeHtml(exp.title)}</h1>
  <p class="license-lead">${escapeHtml(exp.concept)}</p>
  <div class="license-meta">
    <span>${escapeHtml(mod.track || "108 課綱")}</span>
    <span>互動模擬</span>
    <span>繁體中文</span>
  </div>

  <section class="license-section">
    <h2>關鍵公式</h2>
    <p class="static-formula">${escapeHtml(formula)}</p>
  </section>

  <section class="license-section">
    <h2>學習重點</h2>
    <ul>
${points}
    </ul>
  </section>

  <section class="license-section">
    <h2>動手操作</h2>
    <p>這個主題有可即時操作的模擬：調整參數、用碼錶與量角器量測、記錄資料並自動作圖求出物理量。</p>
    <div class="license-cta">
      <a class="static-cta" href="${escapeHtml(appUrl)}">開啟「${escapeHtml(exp.title)}」互動模擬</a>
      <a href="worksheet-${escapeHtml(exp.id)}.html">列印學習單</a>
    </div>
  </section>

  <nav class="license-section static-nav">
    ${prev ? `<a href="${escapeHtml(prev.id)}.html">← ${escapeHtml(prev.title)}</a>` : "<span></span>"}
    ${next ? `<a href="${escapeHtml(next.id)}.html">${escapeHtml(next.title)} →</a>` : "<span></span>"}
  </nav>`;

  return layout({
    title: exp.title + "｜物理實驗室 · " + mod.title,
    description: description,
    canonical, base: "../", build: site.build, gated: site.accessGate !== false,
    body,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "LearningResource",
      name: exp.title,
      description: exp.concept,
      inLanguage: "zh-Hant",
      learningResourceType: "互動模擬",
      educationalLevel: mod.track || "高中",
      isAccessibleForFree: true,
      license: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
      url: canonical
    }
  });
}

/* ---------------------------------------------------------------------------
   學習單（可列印）
   老師最需要的不是再一個網站，而是一張能印出來帶進教室的紙。
   --------------------------------------------------------------------------- */
function worksheetPage(exp, mod, site) {
  const formula = plainFormula(exp.formula);
  const rows = Array.from({ length: 6 }, (_, i) =>
    `        <tr><td>${i + 1}</td><td></td><td></td><td></td></tr>`).join("\n");
  const points = (exp.points || []).map(p => `        <li>${escapeHtml(p)}</li>`).join("\n");

  const body = `  <div class="worksheet">
    <div class="worksheet-head">
      <div>
        <p class="license-kicker">模組${escapeHtml(mod.no)} · ${escapeHtml(mod.title)}</p>
        <h1>${escapeHtml(exp.title)}　學習單</h1>
      </div>
      <div class="worksheet-meta">
        <span>班級 ____________</span>
        <span>座號 ______</span>
        <span>姓名 ____________</span>
      </div>
    </div>

    <section class="worksheet-block">
      <h2>一、實驗目的</h2>
      <p>${escapeHtml(exp.concept)}</p>
    </section>

    <section class="worksheet-block">
      <h2>二、關鍵公式</h2>
      <p class="static-formula">${escapeHtml(formula)}</p>
    </section>

    <section class="worksheet-block">
      <h2>三、動手前先預測</h2>
      <p>打開模擬後，先不要動任何滑桿。閱讀畫面上的預測題並圈選你的答案，寫下理由：</p>
      <p class="worksheet-lines">理由：___________________________________________________________</p>
      <p class="worksheet-lines">_______________________________________________________________</p>
    </section>

    <section class="worksheet-block">
      <h2>四、資料記錄</h2>
      <p>每次只改變一個變因，其餘固定。把改變的量與量測到的量記在表格裡。</p>
      <div class="worksheet-table-wrap">
      <table class="worksheet-table">
        <thead>
          <tr><th>次數</th><th>改變的量（　　　　）</th><th>量測到的量（　　　　）</th><th>備註</th></tr>
        </thead>
        <tbody>
${rows}
        </tbody>
      </table>
      </div>
    </section>

    <section class="worksheet-block worksheet-grid-block">
      <h2>五、作圖</h2>
      <p>把資料點畫上去，如果不是直線，想想看要把哪一軸換成平方、平方根或倒數才會變直。</p>
      <div class="worksheet-grid" aria-hidden="true"></div>
    </section>

    <section class="worksheet-block">
      <h2>六、由圖求值</h2>
      <p class="worksheet-lines">直線斜率 = ________________　　截距 = ________________</p>
      <p class="worksheet-lines">由斜率求得的物理量 = ________________</p>
      <p class="worksheet-lines">與公認值的誤差 = ____________ %　　可能的誤差來源：____________________</p>
    </section>

    <section class="worksheet-block">
      <h2>七、學習重點檢核</h2>
      <ul>
${points}
      </ul>
    </section>

    <section class="worksheet-block">
      <h2>八、一句話結論</h2>
      <p class="worksheet-lines">_______________________________________________________________</p>
      <p class="worksheet-lines">_______________________________________________________________</p>
    </section>

    <p class="worksheet-foot">物理實驗室（${escapeHtml(site.siteUrl)}）· 採 CC BY-NC-SA 4.0 授權，歡迎教學使用與改編</p>
  </div>

  <div class="worksheet-actions">
    <button type="button" onclick="window.print()">列印這張學習單</button>
    <a href="${escapeHtml(exp.id)}.html">回到實驗說明</a>
  </div>`;

  return layout({
    title: exp.title + " 學習單｜物理實驗室",
    description: "可列印的「" + exp.title + "」實驗學習單，含資料記錄表格、作圖區與由圖求值欄位。",
    canonical: site.siteUrl + "p/worksheet-" + exp.id + ".html",
    base: "../", build: site.build, gated: site.accessGate !== false,
    body
  });
}

/* ---------------------------------------------------------------------------
   總索引頁
   --------------------------------------------------------------------------- */
function indexPage(modules, site, total) {
  const sections = modules.map(mod => {
    const items = mod.experiments.map(exp =>
      `      <li><a href="p/${escapeHtml(exp.id)}.html">${escapeHtml(exp.title)}</a><span>${escapeHtml((exp.concept || "").slice(0, 60))}…</span></li>`
    ).join("\n");
    return `  <section class="license-section">
    <h2>模組${escapeHtml(mod.no)}　${escapeHtml(mod.title)}<small>（${mod.experiments.length} 個實驗）</small></h2>
    <ul class="static-list">
${items}
    </ul>
  </section>`;
  }).join("\n");

  const body = `  <p class="license-kicker">全部實驗一覽</p>
  <h1>${total} 個互動物理實驗</h1>
  <p class="license-lead">從國中自然銜接到高中 108 課綱，每個主題都有可即時操作的模擬、可拖曳的量測工具，以及可列印的學習單。全部免費、繁體中文原創。</p>
${sections}`;

  return layout({
    title: "全部實驗一覽｜物理實驗室 · 台灣中學互動物理",
    description: total + " 個對齊 108 課綱的互動物理模擬，涵蓋運動學、力學、波動、光學、電磁與近代物理，全部免費使用。",
    canonical: site.siteUrl + "experiments.html",
    base: "", build: site.build, gated: site.accessGate !== false,
    body
  });
}

/* ---------------------------------------------------------------------------
   正式網址的判定
   ---------------------------------------------------------------------------
   canonical 與 sitemap 需要一個絕對網址，而這個網址在不同環境下不一樣：
   本機是 file://、Vercel 預覽是隨機子網域、正式站才是真正的網址。

   優先順序刻意這樣排：
     1. SITE_URL 環境變數 —— 接自訂網域時只要在 Vercel 後台設一個變數，不必改程式
     2. VERCEL_PROJECT_PRODUCTION_URL —— Vercel 自動注入的「正式站網址」。
        用它而不是 VERCEL_URL 是關鍵：VERCEL_URL 每次部署都不同，
        預覽部署會把 canonical 指到那個一次性網址，等於每推一次就多一份重複內容。
     3. js/site-config.js 裡的 siteUrl —— 本機建置與其他環境的預設值

   注意 Vercel 給的是不含協定的主機名（example.vercel.app），要自己補 https:// 與結尾斜線。
   --------------------------------------------------------------------------- */
function resolveSiteUrl(site) {
  const withSlash = u => (u.endsWith("/") ? u : u + "/");
  const env = process.env.SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (env) {
    const url = /^https?:\/\//.test(env) ? env : "https://" + env;
    return withSlash(url);
  }
  return withSlash(site.siteUrl || "https://yu-0312.github.io/senior-science/");
}

/* ---------------------------------------------------------------------------
   主流程
   --------------------------------------------------------------------------- */
function main() {
  const { curriculum, site } = loadCurriculum();
  if (!curriculum || !Array.isArray(curriculum.modules)) {
    console.error("找不到課程資料，請確認 js/curriculum.js 是否正常。");
    process.exit(1);
  }
  const gated = site.accessGate !== false;
  const siteUrl = resolveSiteUrl(site);
  const conf = { siteUrl, build: site.build || "dev", accessGate: site.accessGate };

  /*
   * 不整個刪掉重建：直接覆寫。
   * 一來避免建置中途失敗就把整個目錄清空，二來某些部署環境不允許刪檔。
   * 課程若移除了實驗，殘留的舊頁面不會出現在新的 sitemap 裡，
   * 下面會列出來提醒手動處理。
   */
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const before = new Set(fs.readdirSync(OUT_DIR).filter(f => f.endsWith(".html")));
  const written = new Set();

  const flat = [];
  curriculum.modules.forEach(mod => mod.experiments.forEach(exp => flat.push({ exp, mod })));

  flat.forEach((item, i) => {
    const prev = i > 0 ? flat[i - 1].exp : null;
    const next = i < flat.length - 1 ? flat[i + 1].exp : null;
    const pageName = item.exp.id + ".html";
    const sheetName = "worksheet-" + item.exp.id + ".html";
    fs.writeFileSync(path.join(OUT_DIR, pageName),
      experimentPage(item.exp, item.mod, i, conf, prev, next), "utf8");
    fs.writeFileSync(path.join(OUT_DIR, sheetName),
      worksheetPage(item.exp, item.mod, conf), "utf8");
    written.add(pageName); written.add(sheetName);
  });

  const stale = [...before].filter(f => !written.has(f));

  fs.writeFileSync(path.join(ROOT, "experiments.html"),
    indexPage(curriculum.modules, conf, flat.length), "utf8");

  /* sitemap：閘門開著時仍然產生，但 robots.txt 會擋住，翻牌後立刻生效 */
  const urls = [
    { loc: siteUrl, priority: "1.0" },
    { loc: siteUrl + "experiments.html", priority: "0.9" },
    { loc: siteUrl + "license.html", priority: "0.3" }
  ].concat(flat.map(item => ({ loc: siteUrl + "p/" + item.exp.id + ".html", priority: "0.8" })))
   .concat(flat.map(item => ({ loc: siteUrl + "p/worksheet-" + item.exp.id + ".html", priority: "0.5" })));

  const today = new Date().toISOString().slice(0, 10);
  const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map(u => `  <url><loc>${u.loc}</loc><lastmod>${today}</lastmod><priority>${u.priority}</priority></url>`).join("\n") +
    "\n</urlset>\n";
  fs.writeFileSync(path.join(ROOT, "sitemap.xml"), sitemap, "utf8");

  const robots = gated
    ? "# 合作試用期間：暫不開放索引。\n# 把 js/site-config.js 的 accessGate 改成 false 並重新建置即可開放。\nUser-agent: *\nDisallow: /\n"
    : "User-agent: *\nAllow: /\n\nSitemap: " + siteUrl + "sitemap.xml\n";
  fs.writeFileSync(path.join(ROOT, "robots.txt"), robots, "utf8");

  console.log("已產生靜態頁面：");
  console.log("  實驗說明頁      " + flat.length + " 頁  → p/<id>.html");
  console.log("  可列印學習單    " + flat.length + " 頁  → p/worksheet-<id>.html");
  console.log("  總索引頁        1 頁   → experiments.html");
  console.log("  sitemap.xml     " + urls.length + " 筆網址");
  console.log("  robots.txt      " + (gated ? "Disallow（閘門開啟中）" : "Allow（已公開）"));
  console.log("");
  if (stale.length) {
    console.log("");
    console.log("提醒：p/ 底下有 " + stale.length + " 個檔案不在這次的課程資料中，");
    console.log("      可能是已移除的實驗，確認後可手動刪除：");
    stale.slice(0, 10).forEach(f => console.log("        p/" + f));
    if (stale.length > 10) console.log("        …等共 " + stale.length + " 個");
  }
  console.log("");
  console.log(gated
    ? "目前是合作試用模式。合作結束後把 js/site-config.js 的 accessGate 改成 false，\n重新執行本腳本並部署，SEO 就會整套上線。"
    : "已是公開模式，搜尋引擎可以索引全部內容。");
}

main();
