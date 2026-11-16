#!/usr/bin/env node
/*
 * minify.js — 部署時把 JS／CSS 的註解與縮排拿掉（傳輸量約少四分之一）
 *
 * 用法（在專案根目錄）：
 *   node tools/minify.js                只檢查：列出每個檔案能省多少、輸出是否通過驗證，不寫任何檔案
 *   node tools/minify.js --out <目錄>   把處理後的整份網站另外寫到 <目錄>（本機想看結果時用）
 *   node tools/minify.js --in-place     直接改寫原檔。只給部署環境用（vercel.json 的 buildCommand）：
 *                                       看到 VERCEL 或 CI 環境變數才動手；本機要加 --force，免得把有註解的原始碼蓋掉。
 *                                       不是部署環境時只印一行說明、什麼都不改，而且照樣回傳成功——
 *                                       這一步是加分項，任何情況都不能擋下一次上線。
 *
 * 為什麼要做：這個專案的程式註解寫得很細（為什麼這樣做、踩過什麼坑），而且是中文，壓縮率不好：
 * 註解加縮排只佔字元數的 15%，卻佔 brotli 壓縮後傳輸量的 22%，而學生的手機用不到它們。
 * 版控裡的檔案維持原樣；只有 Vercel 建置出來、實際送給瀏覽器的那一份被處理。
 *
 * 為什麼不用現成的壓縮工具：專案刻意不帶任何 npm 相依（clone 下來就能跑、不需要 install）。
 * 所以這裡只做兩件最安全的事，不改任何一個有意義的字元：
 *   1. 拿掉註解；
 *   2. 拿掉每一行開頭的縮排與結尾的空白。
 * 不改名、不合併行、不動字串。**行數完全不變**：線上報錯的行號和 GitHub 上同一版的原始碼是同一行。
 *
 * 安全網（任何一項不過，該檔就原封不動，並回報）：
 *   · 看不懂的寫法（字串或正規表示式沒有在同一行結束…）直接放棄這個檔案；
 *   · 輸出的行數必須和輸入相同，每一行只能比原本少字、不能多出或換掉任何字；
 *   · JS 輸出必須能被 V8 編譯（vm.Script）；CSS 的大括號必須成對。
 * tools/tests/minify-test.js 另外用一組刁鑽的寫法鎖住分詞器的行為。
 * 2026-11 加入時，112 個檔案另外用 esbuild 交叉比對過：原檔與處理後的檔案各自交給 esbuild 壓縮，結果逐字相同。
 */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const zlib = require("zlib");

const KEYWORDS_BEFORE_REGEX = new Set(["return", "typeof", "instanceof", "in", "of", "new", "delete", "void", "throw", "case", "do", "else", "yield", "await"]);

class Unsupported extends Error {}

/* 一行收尾：不在字串／樣板裡開頭的行去掉縮排，不在裡面結尾的行去掉行尾空白 */
function makeWriter() {
  let out = "", line = "", startInLiteral = false, pendingGap = false;
  return {
    put(s) {
      if (pendingGap) {
        // 註解原本的位置前後合起來只留一個空白：兩邊都沒有空白就補一個，兩邊都有就少留一個
        const spaceBefore = line === "" || /[ \t]$/.test(line);
        if (/^[ \t\r]/.test(s)) {
          if (spaceBefore) { s = s.replace(/^[ \t\r]+/, ""); if (!s) return; }
        } else if (!spaceBefore) line += " ";
        pendingGap = false;
      }
      line += s;
    },
    /* 行內被拿掉註解之後留一個空白，免得前後兩個字黏在一起（return/＊…＊/x） */
    gap() { pendingGap = true; },
    newline(endInLiteral) {
      pendingGap = false;
      let l = line;
      if (!startInLiteral) l = l.replace(/^[ \t\r]+/, "");
      if (!endInLiteral) l = l.replace(/[ \t\r]+$/, "");
      out += l + "\n";
      line = ""; startInLiteral = !!endInLiteral;
    },
    finish() {
      let l = line;
      if (!startInLiteral) l = l.replace(/^[ \t\r]+/, "");
      l = l.replace(/[ \t\r]+$/, "");
      return out + l;
    }
  };
}

/* ------------------------------- JS ------------------------------- */
function stripJs(src) {
  const w = makeWriter();
  const n = src.length;
  let i = 0;
  let prevValue = false;          // 上一個有意義的記號是不是「值」：是的話接下來的 / 是除號，否則是正規表示式
  let brace = 0;
  const tpl = [];                 // 樣板字串 ${ … } 的巢狀：記下進入時的大括號深度
  const ident = /[A-Za-z_$\u0080-￿][\w$\u0080-￿]*/y;
  const number = /\.?[0-9][\w.]*/y;

  function readTemplate() {       // 進來時 i 指在開頭的 ` 或 } 之後
    while (i < n) {
      const c = src[i];
      if (c === "\\") { w.put(src.substr(i, 2)); i += 2; continue; }
      if (c === "`") { w.put(c); i++; prevValue = true; return; }
      if (c === "$" && src[i + 1] === "{") { w.put("${"); i += 2; tpl.push(brace); brace++; prevValue = false; return; }
      if (c === "\n") { w.newline(true); i++; continue; }
      w.put(c); i++;
    }
    throw new Unsupported("樣板字串沒有結束");
  }

  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === "\n") { w.newline(false); i++; continue; }
    if (c === " " || c === "\t" || c === "\r") { w.put(c); i++; continue; }
    if (c === "/" && d === "/") {                       // 行註解：整段拿掉到行尾
      while (i < n && src[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && d === "*") {                       // 區塊註解：拿掉，但保留裡面的換行
      const end = src.indexOf("*/", i + 2);
      if (end < 0) throw new Unsupported("區塊註解沒有結束");
      const body = src.slice(i, end + 2);
      const lines = body.split("\n").length - 1;
      if (lines === 0) w.gap();
      for (let k = 0; k < lines; k++) w.newline(false);
      i = end + 2;
      continue;
    }
    if (c === '"' || c === "'") {                       // 字串
      let j = i + 1;
      for (;;) {
        if (j >= n) throw new Unsupported("字串沒有結束");
        const ch = src[j];
        if (ch === "\\") { if (src[j + 1] === "\n" || src[j + 1] === "\r") throw new Unsupported("跨行字串"); j += 2; continue; }
        if (ch === "\n") throw new Unsupported("字串沒有在同一行結束（第 " + (src.slice(0, j).split("\n").length) + " 行）");
        if (ch === c) break;
        j++;
      }
      w.put(src.slice(i, j + 1)); i = j + 1; prevValue = true;
      continue;
    }
    if (c === "`") { w.put(c); i++; readTemplate(); continue; }
    if (c === "/") {
      if (prevValue) { w.put(c); i++; prevValue = false; continue; }     // 除號
      let j = i + 1, inClass = false;                                     // 正規表示式
      for (;;) {
        if (j >= n) throw new Unsupported("正規表示式沒有結束");
        const ch = src[j];
        if (ch === "\n") throw new Unsupported("正規表示式沒有在同一行結束（第 " + (src.slice(0, j).split("\n").length) + " 行）");
        if (ch === "\\") { j += 2; continue; }
        if (ch === "[") inClass = true;
        else if (ch === "]") inClass = false;
        else if (ch === "/" && !inClass) break;
        j++;
      }
      j++;
      while (j < n && /[a-z]/i.test(src[j])) j++;
      w.put(src.slice(i, j)); i = j; prevValue = true;
      continue;
    }
    ident.lastIndex = i;
    let m = ident.exec(src);
    if (m) { w.put(m[0]); i += m[0].length; prevValue = !KEYWORDS_BEFORE_REGEX.has(m[0]); continue; }
    number.lastIndex = i;
    m = number.exec(src);
    if (m) { w.put(m[0]); i += m[0].length; prevValue = true; continue; }
    if ((c === "+" || c === "-") && d === c) { w.put(c + d); i += 2; continue; }   // ++／--：不改變「前面是不是值」
    if (c === "{") brace++;
    if (c === "}") {
      brace--;
      if (tpl.length && tpl[tpl.length - 1] === brace) { tpl.pop(); w.put(c); i++; readTemplate(); continue; }
    }
    w.put(c); i++;
    prevValue = c === ")" || c === "]" || c === "}";
  }
  if (tpl.length) throw new Unsupported("樣板字串的 ${ 沒有結束");
  return w.finish();
}

/* ------------------------------- CSS ------------------------------- */
function stripCss(src) {
  const w = makeWriter();
  const n = src.length;
  let i = 0;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === "\n") { w.newline(false); i++; continue; }
    if (c === "/" && d === "*") {
      const end = src.indexOf("*/", i + 2);
      if (end < 0) throw new Unsupported("註解沒有結束");
      const lines = src.slice(i, end + 2).split("\n").length - 1;
      if (lines === 0) w.gap();
      for (let k = 0; k < lines; k++) w.newline(false);
      i = end + 2;
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      for (;;) {
        if (j >= n) throw new Unsupported("字串沒有結束");
        const ch = src[j];
        if (ch === "\\") { if (src[j + 1] === "\n") throw new Unsupported("跨行字串"); j += 2; continue; }
        if (ch === "\n") throw new Unsupported("字串沒有在同一行結束");
        if (ch === c) break;
        j++;
      }
      w.put(src.slice(i, j + 1)); i = j + 1;
      continue;
    }
    // 沒加引號的 url(…)：裡面可能有 // 或 /*，整段原樣保留
    if ((c === "u" || c === "U") && /^url\(/i.test(src.substr(i, 4))) {
      let j = i + 4;
      while (j < n && /\s/.test(src[j])) j++;
      if (src[j] !== '"' && src[j] !== "'") {
        const end = src.indexOf(")", j);
        if (end < 0 || src.slice(i, end).indexOf("\n") >= 0) throw new Unsupported("url() 沒有在同一行結束");
        w.put(src.slice(i, end + 1)); i = end + 1;
        continue;
      }
    }
    w.put(c); i++;
  }
  return w.finish();
}

/* ------------------------------- 驗證 ------------------------------- */
function verify(kind, before, after, name) {
  const a = before.split("\n"), b = after.split("\n");
  if (a.length !== b.length) return "行數變了（" + a.length + " → " + b.length + "）";
  /*
   * 每一行只能「少」不能「多」也不能「換」：不看空白的話，輸出那一行的字元
   * 必須依序都出現在原本那一行裡。這條檢查不依賴上面的分詞器，
   * 擋的是「改到內容」這一類錯；「少掉不該少的」則由下面的編譯檢查接住。
   */
  for (let k = 0; k < a.length; k++) {
    if (b[k] === "" || b[k] === a[k]) continue;
    const from = a[k].replace(/\s+/g, ""), to = b[k].replace(/\s+/g, "");
    let p = 0;
    for (let q = 0; q < to.length; q++) {
      p = from.indexOf(to[q], p);
      if (p < 0) return "第 " + (k + 1) + " 行出現了原本沒有的內容";
      p++;
    }
  }
  if (kind === "js") {
    try { new vm.Script(after, { filename: name }); }
    catch (e) { return "處理後無法編譯：" + e.message; }
  } else {
    const count = (s, ch) => s.split(ch).length - 1;
    const bare = after.replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g, "");
    if (count(bare, "{") !== count(bare, "}")) return "大括號不成對";
  }
  return null;
}

function strip(kind, src, name) {
  try {
    const out = kind === "js" ? stripJs(src) : stripCss(src);
    const problem = verify(kind, src, out, name);
    return problem ? { ok: false, reason: problem } : { ok: true, out };
  } catch (e) {
    if (e instanceof Unsupported) return { ok: false, reason: e.message };
    throw e;
  }
}

/* ------------------------------- 檔案清單 ------------------------------- */
/* 送給瀏覽器的程式與樣式。tools/、測試、圖示與 HTML 不動。 */
function targets(root) {
  const out = [];
  const walk = (rel) => {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) return;
    fs.readdirSync(abs, { withFileTypes: true }).forEach(e => {
      const r = rel + "/" + e.name;
      if (e.isDirectory()) walk(r);
      else if (/\.(js|css)$/.test(e.name)) out.push(r);
    });
  };
  ["", "ja/"].forEach(prefix => {
    walk(prefix + "js"); walk(prefix + "css"); walk(prefix + "duo");
    if (fs.existsSync(path.join(root, prefix + "sw.js"))) out.push(prefix + "sw.js");
  });
  return out.sort();
}

module.exports = { stripJs, stripCss, strip, targets, Unsupported };

/* ------------------------------- 指令列 ------------------------------- */
if (require.main === module) {
  const ROOT = path.resolve(__dirname, "..");
  const args = process.argv.slice(2);
  const inPlace = args.includes("--in-place");
  const outIdx = args.indexOf("--out");
  const outDir = outIdx >= 0 ? path.resolve(args[outIdx + 1] || "") : null;
  if (outIdx >= 0 && !args[outIdx + 1]) { console.error("--out 後面要接目錄"); process.exit(1); }
  if (inPlace && !process.env.VERCEL && !process.env.CI && !args.includes("--force")) {
    console.warn("minify：跳過，沒有改寫任何檔案。\n" +
      "  --in-place 會把有註解的原始碼直接改掉，只在部署環境（有 VERCEL 或 CI 環境變數）執行。\n" +
      "  本機想看結果請用 --out <目錄>；真的要改寫請加 --force。");
    process.exit(0);
  }

  if (outDir) {
    // 先整份複製一份（略過版控與測試工具），再改寫其中的 JS／CSS
    const skip = new Set([".git", "node_modules", "tools", ".github"]);
    const copy = (rel) => {
      const from = path.join(ROOT, rel), to = path.join(outDir, rel);
      fs.mkdirSync(to, { recursive: true });
      fs.readdirSync(from, { withFileTypes: true }).forEach(e => {
        if (!rel && skip.has(e.name)) return;
        if (path.resolve(from, e.name) === outDir) return;
        const r = rel ? rel + "/" + e.name : e.name;
        if (e.isDirectory()) copy(r); else if (e.isFile()) fs.copyFileSync(path.join(ROOT, r), path.join(outDir, r));
      });
    };
    copy("");
  }

  const files = targets(ROOT);
  const br = s => zlib.brotliCompressSync(Buffer.from(s), { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 9 } }).length;
  let rawBefore = 0, rawAfter = 0, brBefore = 0, brAfter = 0, skipped = 0, written = 0;
  const measure = !inPlace || args.includes("--stats");
  files.forEach(rel => {
    const abs = path.join(ROOT, rel);
    const src = fs.readFileSync(abs, "utf8");
    let res;
    // 工具自己出錯（不是「看不懂就放棄」那一類）也一樣：這個檔案原樣上線，不讓整次建置失敗
    try { res = strip(/\.css$/.test(rel) ? "css" : "js", src, rel); }
    catch (e) { res = { ok: false, reason: "工具錯誤：" + (e && e.message) }; }
    if (!res.ok) {
      skipped += 1;
      console.warn("  ! " + rel + " 維持原樣：" + res.reason);
      if (measure) { rawBefore += src.length; rawAfter += src.length; const b = br(src); brBefore += b; brAfter += b; }
      return;
    }
    if (measure) { rawBefore += src.length; rawAfter += res.out.length; brBefore += br(src); brAfter += br(res.out); }
    if (res.out === src) return;
    if (inPlace) { fs.writeFileSync(abs, res.out); written += 1; }
    else if (outDir) { fs.writeFileSync(path.join(outDir, rel), res.out); written += 1; }
  });

  const kb = v => (v / 1024).toFixed(0) + " KB";
  console.log("minify：" + files.length + " 個檔案" + (inPlace || outDir ? "，改寫 " + written + " 個" : "（只檢查，沒有寫檔）") +
    (skipped ? "，" + skipped + " 個維持原樣" : ""));
  if (measure) {
    console.log("  字元數 " + kb(rawBefore) + " → " + kb(rawAfter) + "（少 " + (100 - rawAfter / rawBefore * 100).toFixed(0) + "%）");
    console.log("  brotli 傳輸量 " + kb(brBefore) + " → " + kb(brAfter) + "（少 " + (100 - brAfter / brBefore * 100).toFixed(0) + "%）");
  }
  // 部署時不因為某個檔案處理不了而擋下整次上線（它只是沒被縮小）；檢查模式則要明確失敗，CI 才看得到
  if (skipped && !inPlace) process.exit(1);
}
