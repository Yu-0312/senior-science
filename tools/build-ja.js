#!/usr/bin/env node
/*
 * build-ja.js — 產生日文版（ja/）
 *
 * 原始碼一律維持中文。這支把「學生看得到的中文字串」換成 i18n/ja.json 裡的日文，
 * 整個網站複製一份到 ja/：JS 的字串與樣板字串、HTML 的文字與 title／aria-label／
 * placeholder／alt／content 屬性、manifest.json。程式邏輯完全不動，
 * 所以改了中文版的程式，重跑這支日文版就跟著更新；只有新寫的中文字串要補翻譯。
 *
 * 用法：
 *   node tools/build-ja.js           產生 ja/（含 ja/p 說明頁、ja/experiments.html、ja/sitemap.xml）
 *   node tools/build-ja.js --todo    把還沒翻的字串寫到 i18n/ja-todo.json（附檔名、行號與那一行原始碼）
 *   node tools/build-ja.js --check   只統計，不寫檔；有沒翻的字串時結束碼為 1
 *   node tools/build-ja.js --out 資料夾   輸出到別的資料夾（ja-test 用來確認 ja/ 是最新的）
 *
 * 字典的鍵是「字串本身」（JS 字串解開跳脫字元之後的內容；HTML 文字去掉頭尾空白、連續空白併成一個）。
 * 一個字串被拆成好幾段接起來時（"「" + label + "」調大"），每一段各自翻，
 * 翻的時候要看那一行原始碼，讓接起來的日文語序是通的。
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const OUT_ARG = process.argv.indexOf("--out");
// --out <資料夾>：輸出到別處（測試用來比對 ja/ 是不是最新的）
const OUT = OUT_ARG > 0 ? path.resolve(process.argv[OUT_ARG + 1]) : path.join(ROOT, "ja");
const DICT_FILE = path.join(ROOT, "i18n", "ja.json");
const TODO_FILE = path.join(ROOT, "i18n", "ja-todo.json");
const CJK = /[一-鿿]/;

const args = process.argv.slice(2);
const MODE = args.includes("--todo") ? "todo" : args.includes("--check") ? "check" : "build";

const dict = fs.existsSync(DICT_FILE) ? JSON.parse(fs.readFileSync(DICT_FILE, "utf8")) : {};

/* ---------------------------------------------------------------------------
   JS：找出每一個字串（含樣板字串的每一段），記下位置
   --------------------------------------------------------------------------- */
function cook(raw) {
  return raw.replace(/\\(u\{[0-9a-fA-F]+\}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|\r\n|[\s\S])/g, (m, e) => {
    if (e[0] === "u" && e[1] === "{") return String.fromCodePoint(parseInt(e.slice(2, -1), 16));
    if (e[0] === "u" && e.length === 5) return String.fromCharCode(parseInt(e.slice(1), 16));
    if (e[0] === "x" && e.length === 3) return String.fromCharCode(parseInt(e.slice(1), 16));
    if (e === "\n" || e === "\r\n") return "";
    return { n: "\n", t: "\t", r: "\r", b: "\b", f: "\f", v: "\v", 0: "\0" }[e] ?? e;
  });
}
function jsTokens(src) {
  const out = [];
  let i = 0, prev = "";
  const n = src.length;
  const lineAt = idx => { let l = 1; for (let k = 0; k < idx; k++) if (src.charCodeAt(k) === 10) l++; return l; };
  const regexOK = () => prev === "" || /[(,=:[!&|?{};+\-*%<>~^]/.test(prev) ||
    /\b(return|typeof|case|in|of|delete|void|throw|new)$/.test(src.slice(Math.max(0, i - 8), i).trimEnd());
  function readString(q) {
    const s = ++i;
    while (i < n && src[i] !== q) { if (src[i] === "\\") i++; i++; }
    out.push({ kind: q, start: s, end: i, raw: src.slice(s, i) });
    i++;
  }
  function readTemplate() {
    // R`...`、String.raw`...` 這種帶標籤的樣板字串不解跳脫字元（公式裡的 \( \text 要原樣保留）
    const before = src.slice(Math.max(0, i - 12), i).trimEnd();
    const tagged = /[\w$)\]]$/.test(before) && !/\b(return|typeof|case|in|of|delete|void|throw|new|else|do|yield|await)$/.test(before);
    let s = ++i;
    while (i < n && src[i] !== "`") {
      if (src[i] === "\\") { i += 2; continue; }
      if (src[i] === "$" && src[i + 1] === "{") {
        out.push({ kind: tagged ? "raw" : "`", start: s, end: i, raw: src.slice(s, i) });
        i += 2; code(1); s = i; continue;
      }
      i++;
    }
    out.push({ kind: tagged ? "raw" : "`", start: s, end: i, raw: src.slice(s, i) });
    i++;
  }
  function code(depth) {
    while (i < n) {
      const c = src[i], d = src[i + 1];
      if (/\s/.test(c)) { i++; continue; }
      if (c === "/" && d === "/") { while (i < n && src[i] !== "\n") i++; continue; }
      if (c === "/" && d === "*") { i += 2; while (i < n && !(src[i] === "*" && src[i + 1] === "/")) i++; i += 2; continue; }
      if (c === "'" || c === '"') { readString(c); prev = "a"; continue; }
      if (c === "`") { readTemplate(); prev = "a"; continue; }
      if (c === "/" && regexOK()) {
        const rs = ++i; let cls = false;
        while (i < n && (cls || src[i] !== "/")) { if (src[i] === "\\") i++; else if (src[i] === "[") cls = true; else if (src[i] === "]") cls = false; i++; }
        if (CJK.test(src.slice(rs, i))) out.push({ kind: "regex", start: rs, end: i, raw: src.slice(rs, i) });
        i++; while (/[a-z]/.test(src[i] || "")) i++;
        prev = "a"; continue;
      }
      if (depth) { if (c === "{") depth++; else if (c === "}") { depth--; if (!depth) { i++; return; } } }
      prev = c; i++;
    }
  }
  code(0);
  out.forEach(t => { t.text = t.kind === "raw" || t.kind === "regex" ? t.raw : cook(t.raw); t.line = lineAt(t.start); });
  return out;
}
function escapeFor(kind, s) {
  if (kind === "raw") return s.replace(/`/g, "'").replace(/\$\{/g, "$ {");
  s = s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t");
  if (kind === "`") return s.replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
  return s.split(kind).join("\\" + kind);
}

/* ---------------------------------------------------------------------------
   翻譯與統計
   --------------------------------------------------------------------------- */
const missing = new Map();    // 中文 → [{file, line, ctx}]
let total = 0, hit = 0;
// 沒有中文、只有標點的片段（"」，"、"，"）：中文逗號換成日文的「、」
const PUNCT_ONLY = /^[^A-Za-z0-9\u4e00-\u9fff]*[，；][^A-Za-z0-9\u4e00-\u9fff]*$/;
function lookup(text, file, line, ctx) {
  if (!CJK.test(text)) return PUNCT_ONLY.test(text) ? text.replace(/，/g, "、").replace(/；/g, "。") : null;
  total++;
  if (Object.prototype.hasOwnProperty.call(dict, text)) { hit++; return dict[text]; }
  if (!missing.has(text)) missing.set(text, []);
  const list = missing.get(text);
  if (list.length < 3) list.push({ file, line, ctx: (ctx || "").trim().slice(0, 240) });
  return null;
}
const srcLine = (src, line) => src.split("\n")[line - 1] || "";

/* 程式裡用中文正規表示式比對標籤或狀態字（例如 /判讀|狀態/.test(label)）。
   標籤翻成日文後就比對不到，所以把「原本比得到的短字串」的日文整串加進去，
   以 ^…$ 完整比對，語意和中文版一致。 */
function expandRegex(src) {
  let re;
  try { re = new RegExp(src); } catch (e) { return null; }
  const alts = new Set();
  Object.keys(dict).forEach(k => {
    const v = dict[k];
    if (k.length > 40 || !v || v.length > 60 || /[\r\n\u2028\u2029]/.test(v) || !re.test(k) || re.test(v)) return;
    alts.add("^" + v.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&") + "$");
  });
  return alts.size ? src + "|" + [...alts].sort().join("|") : null;
}
function translateJs(src, file, lineOffset = 0, wholeSrc = src) {
  const toks = jsTokens(src);
  let out = "", last = 0;
  toks.forEach(t => {
    if (t.kind === "regex") {
      const ja = expandRegex(t.text);
      if (ja != null) { out += src.slice(last, t.start) + ja; last = t.end; }
      return;
    }
    const ja = lookup(t.text, file, t.line + lineOffset, srcLine(wholeSrc, t.line + lineOffset));
    if (ja == null) return;
    out += src.slice(last, t.start) + escapeFor(t.kind, ja);
    last = t.end;
  });
  return out + src.slice(last);
}

const norm = s => s.replace(/\s+/g, " ").trim();
function translateHtml(src, file) {
  const lineAt = idx => src.slice(0, idx).split("\n").length;
  const edits = [];
  // 行內 script（JSON-LD 另外處理）
  src.replace(/(<script\b[^>]*>)([\s\S]*?)<\/script>/gi, (m, open, body, idx) => {
    const at = idx + open.length;
    if (/ld\+json/.test(open)) {
      try {
        const data = JSON.parse(body);
        const walk = v => typeof v === "string" ? (lookup(v, file, lineAt(at), v) ?? v)
          : Array.isArray(v) ? v.map(walk) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)])) : v;
        edits.push([at, at + body.length, "\n" + JSON.stringify(walk(data), null, 2) + "\n"]);
      } catch (e) { /* 不是合法 JSON 就不動 */ }
    } else if (body.trim() && !/src=/.test(open)) {
      const t = translateJs(body, file, lineAt(at) - 1, src);
      if (t !== body) edits.push([at, at + body.length, t]);
    }
    return m;
  });
  const masked = src.replace(/<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>|<!--[\s\S]*?-->/gi, m => m.replace(/[^\n]/g, " "));
  masked.replace(/(\s(?:content|alt|title|aria-label|placeholder)=")([^"]*)"/g, (m, pre, v, idx) => {
    const ja = lookup(norm(v), file, lineAt(idx), srcLine(src, lineAt(idx)));
    if (ja != null) edits.push([idx + pre.length, idx + pre.length + v.length, ja.replace(/"/g, "&quot;")]);
    return m;
  });
  masked.replace(/>([^<]+)</g, (m, t, idx) => {
    const key = norm(t);
    const ja = lookup(key, file, lineAt(idx + 1), srcLine(src, lineAt(idx + 1)));
    if (ja == null) return m;
    const lead = t.match(/^\s*/)[0], tail = t.match(/\s*$/)[0];
    edits.push([idx + 1, idx + 1 + t.length, lead + ja + tail]);
    return m;
  });
  edits.sort((a, b) => b[0] - a[0]);
  let out = src;
  edits.forEach(([s, e, t]) => { out = out.slice(0, s) + t + out.slice(e); });
  return out;
}

/* ---------------------------------------------------------------------------
   日文版專屬的調整：語言、字型、網址、語言切換
   --------------------------------------------------------------------------- */
function siteBase() {
  const env = process.env.SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;
  let u = env ? (/^https?:\/\//.test(env) ? env : "https://" + env) : null;
  if (!u) { const m = /siteUrl:\s*"([^"]+)"/.exec(fs.readFileSync(path.join(ROOT, "js/site-config.js"), "utf8")); u = m ? m[1] : "https://senior-science.vercel.app/"; }
  return u.endsWith("/") ? u : u + "/";
}
const BASE = siteBase();
const JA_FONT = "'Hiragino Sans','Hiragino Kaku Gothic ProN','Yu Gothic UI','Meiryo'";
function localizeCommon(s) {
  return s
    .replace(/'PingFang TC','Microsoft JhengHei'/g, JA_FONT)
    .replace(/'PingFang TC'/g, JA_FONT)
    .replace(/"PingFang TC", "Microsoft JhengHei", "Noto Sans TC"/g, '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic UI", "Meiryo", "Noto Sans JP"')
    .replace(/"Noto Serif TC", "Noto Serif CJK TC", "Source Han Serif TC", "Songti TC", "PMingLiU"/g, '"Noto Serif JP", "Noto Serif CJK JP", "Hiragino Mincho ProN", "Yu Mincho"')
    .replace(/toLocale(Time|Date)?String\("zh-TW"/g, 'toLocale$1String("ja-JP"');
}
function localizeHtml(s) {
  s = s.replace(/<html lang="zh-Hant"/g, '<html lang="ja"')
    .replace(/family=Noto\+Serif\+TC/g, "family=Noto+Serif+JP");
  // 絕對網址（canonical、og:url）改指日文版；hreflang 的對照連結不動
  s = s.split("\n").map(l => /rel="alternate"/.test(l) ? l : l.split(BASE).join(BASE + "ja/")).join("\n");
  // 語言切換：中文版的「日本語」連結在日文版指回上一層
  s = s.replace(/href="ja\/" hreflang="ja" lang="ja"/g, 'href="../" hreflang="zh-Hant" lang="zh-Hant"');
  // CC 授權說明頁改連日文版；HTML 註解是寫給維護者的中文，日文版不需要
  s = s.replace(/(creativecommons\.org\/licenses\/[^"]*?)\/(deed|legalcode)\.zh-hant/g, "$1/$2.ja")
    .replace(/\n?[ \t]*<!--(?!\[)[\s\S]*?-->/g, "");
  return localizeCommon(s);
}

/* ---------------------------------------------------------------------------
   主流程
   --------------------------------------------------------------------------- */
function listFiles(dir, re, out = []) {
  if (!fs.existsSync(dir)) return out;
  fs.readdirSync(dir, { withFileTypes: true }).forEach(d => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) listFiles(p, re, out); else if (re.test(d.name)) out.push(p);
  });
  return out;
}
const rel = p => path.relative(ROOT, p).split(path.sep).join("/");
const HTML = ["index.html", "lab.html", "licensing.html", "duo/index.html", "duo/embed.html"];
const JS = listFiles(path.join(ROOT, "js"), /\.js$/).map(rel).concat(["duo/duo.js", "sw.js"]);
const COPY = listFiles(path.join(ROOT, "css"), /\.css$/).map(rel).concat(["duo/duo.css"])
  .concat(listFiles(path.join(ROOT, "icons"), /\.(png|svg|ico|webp)$/).map(rel));

const outputs = [];
HTML.forEach(f => outputs.push([f, localizeHtml(translateHtml(fs.readFileSync(path.join(ROOT, f), "utf8"), f))]));
JS.forEach(f => {
  let s = translateJs(fs.readFileSync(path.join(ROOT, f), "utf8"), f);
  if (f === "sw.js") s = s.replace(/"physics-lab-" \+ BUILD/, '"physics-lab-ja-" + BUILD');
  if (f === "js/site-config.js") s = s.split(BASE).join(BASE + "ja/");
  outputs.push([f, localizeCommon(s)]);
});
// CSS 的 content: "…"（離線提示、檢視欄標題）也是學生看得到的字
COPY.filter(f => /\.css$/.test(f)).forEach(f => {
  const css = fs.readFileSync(path.join(ROOT, f), "utf8").replace(/(content:\s*)"([^"\n]*)"/g, (m, pre, text, idx, whole) => {
    const ja = lookup(text, f, whole.slice(0, idx).split("\n").length, m);
    return ja == null ? m : pre + '"' + ja.replace(/"/g, '\\"') + '"';
  });
  outputs.push([f, localizeCommon(css)]);
});
{
  const m = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));
  ["name", "short_name", "description"].forEach(k => { if (m[k]) { const ja = lookup(m[k], "manifest.json", 0, k); if (ja != null) m[k] = ja; } });
  m.lang = "ja";
  outputs.push(["manifest.json", JSON.stringify(m, null, 2) + "\n"]);
}
// 說明頁、學習單、索引：用翻好的 build-static.js 在 ja/ 底下重跑一次
const staticSrc = translateJs(fs.readFileSync(path.join(ROOT, "tools/build-static.js"), "utf8"), "tools/build-static.js");

const missingCount = missing.size;
console.log("日文版：" + hit + " / " + total + " 個字串已翻譯，還缺 " + missingCount + " 種");

if (MODE === "todo") {
  const list = [...missing.entries()].map(([zh, where]) => ({ zh, where }));
  fs.writeFileSync(TODO_FILE, JSON.stringify(list, null, 1) + "\n");
  console.log("已寫入 " + rel(TODO_FILE));
} else if (MODE === "check") {
  process.exit(missingCount ? 1 : 0);
} else {
  outputs.forEach(([f, s]) => { const p = path.join(OUT, f); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); });
  COPY.forEach(f => {
    const p = path.join(OUT, f); fs.mkdirSync(path.dirname(p), { recursive: true });
    if (!/\.css$/.test(f)) fs.copyFileSync(path.join(ROOT, f), p);   // CSS 已在上面翻好、放進 outputs
  });
  const tmp = path.join(OUT, "tools", "build-static.js");
  fs.mkdirSync(path.dirname(tmp), { recursive: true });
  fs.writeFileSync(tmp, staticSrc);
  try {
    execFileSync(process.execPath, [tmp], { cwd: OUT, env: Object.assign({}, process.env, { SITE_URL: BASE + "ja/" }), stdio: "ignore" });
  } finally {
    fs.rmSync(path.join(OUT, "tools"), { recursive: true, force: true });
    fs.rmSync(path.join(OUT, "robots.txt"), { force: true });
  }
  console.log("已輸出 ja/");
}
