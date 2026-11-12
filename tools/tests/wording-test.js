/*
 * wording-test.js — 學生看得到的文字：不用破折號「——」，中文句子不用半形標點
 *
 * 由來：2026-11 整理全站文字時，四個站加起來有上千個「——」和兩千多個半形 , ; : ( )，
 * 讀起來很像機器產生的。改完之後用這支守住，新寫的提示、解析不要再混進來。
 *
 * 只看會出現在網站上的字：JS 的字串（含樣板字串）、HTML 的文字與 title／aria-label／
 * placeholder／alt／content 屬性。程式註解、tools/tests 不檢查。
 * 不需要安裝任何套件：JS 用一個小型掃描器把字串挑出來（會跳過註解與正規表達式）。
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { reporter } = require("./_lib.js");
const R = reporter();

const CJK = /[一-鿿]/;

/* ---------- 把 JS 原始碼裡的字串挑出來 ---------- */
function jsStrings(src) {
  const out = [];
  let i = 0, line = 1, prev = "";               // prev：上一個有意義的字元，用來判斷 / 是除號還是正規表達式
  const n = src.length;
  const regexOK = () => prev === "" || /[(,=:[!&|?{};+\-*%<>~^]/.test(prev) || /\b(return|typeof|case|in|of|delete|void|throw|new)$/.test(src.slice(Math.max(0, i - 8), i).trimEnd());
  function readString(q) {                      // i 指在開頭引號
    const start = line; let s = ""; i++;
    while (i < n && src[i] !== q) {
      if (src[i] === "\\") { s += src[i + 1] || ""; i += 2; continue; }
      if (src[i] === "\n") line++;
      s += src[i++];
    }
    i++; out.push({ line: start, text: s });
  }
  function readTemplate() {                     // i 指在 `
    let s = "", start = line; i++;
    while (i < n && src[i] !== "`") {
      if (src[i] === "\\") { s += src[i + 1] || ""; i += 2; continue; }
      if (src[i] === "$" && src[i + 1] === "{") {
        if (s) out.push({ line: start, text: s }); s = "";
        i += 2; code(1); start = line; continue;
      }
      if (src[i] === "\n") line++;
      s += src[i++];
    }
    i++; if (s) out.push({ line: start, text: s });
  }
  function code(depth) {                        // depth > 0：在 ${ } 裡，遇到對應的 } 就回去
    while (i < n) {
      const c = src[i], d = src[i + 1];
      if (c === "\n") { line++; i++; continue; }
      if (/\s/.test(c)) { i++; continue; }
      if (c === "/" && d === "/") { while (i < n && src[i] !== "\n") i++; continue; }
      if (c === "/" && d === "*") { i += 2; while (i < n && !(src[i] === "*" && src[i + 1] === "/")) { if (src[i] === "\n") line++; i++; } i += 2; continue; }
      if (c === "'" || c === '"') { readString(c); prev = "a"; continue; }
      if (c === "`") { readTemplate(); prev = "a"; continue; }
      if (c === "/" && regexOK()) {             // 正規表達式：跳到結尾，含 [...] 字元類別
        i++; let cls = false;
        while (i < n && (cls || src[i] !== "/")) { if (src[i] === "\\") i++; else if (src[i] === "[") cls = true; else if (src[i] === "]") cls = false; i++; }
        i++; while (/[a-z]/.test(src[i] || "")) i++;
        prev = "a"; continue;
      }
      if (depth) { if (c === "{") depth++; else if (c === "}") { depth--; if (!depth) { i++; return; } } }
      prev = c; i++;
    }
  }
  code(0);
  return out;
}

/* ---------- HTML：文字節點與看得到的屬性 ---------- */
function htmlStrings(src) {
  const out = [];
  const lineAt = idx => src.slice(0, idx).split("\n").length;
  src.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, (m, body, idx) => {
    if (!/ld\+json/.test(m)) jsStrings(body).forEach(s => out.push({ line: lineAt(idx) + s.line - 1, text: s.text }));
    return m;
  });
  const masked = src.replace(/<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>|<!--[\s\S]*?-->/gi, m => m.replace(/[^\n]/g, " "));
  masked.replace(/\s(?:content|alt|title|aria-label|placeholder)="([^"]*)"/g, (m, v, idx) => { out.push({ line: lineAt(idx), text: v }); return m; });
  masked.replace(/>([^<]+)</g, (m, t, idx) => { out.push({ line: lineAt(idx), text: t }); return m; });
  return out;
}

function listFiles(dir, out) {
  if (!fs.existsSync(dir)) return out;
  fs.readdirSync(dir, { withFileTypes: true }).forEach(d => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) { if (!/^(\.git|node_modules|tools|p|docs)$/.test(d.name)) listFiles(p, out); }
    else if (/\.(js|html)$/.test(d.name) && !/^(sw\.js|experiments\.html)$/.test(d.name)) out.push(p);
  });
  return out;
}

const files = listFiles(".", []).concat(["tools/build-static.js"].filter(f => fs.existsSync(f)));
const dash = [], half = [];
let count = 0;
files.forEach(f => {
  const src = fs.readFileSync(f, "utf8");
  const strings = f.endsWith(".html") ? htmlStrings(src) : jsStrings(src);
  strings.forEach(s => {
    if (!CJK.test(s.text)) return;
    count++;
    const where = f.replace(/^\.\//, "") + ":" + s.line + "  ";
    let m;
    if ((m = s.text.match(/.{0,12}——.{0,12}/))) dash.push(where + m[0]);
    // 中文後面的半形標點；v頂,min 這種下標（後面緊接小寫英文）不算
    const re = /[一-鿿）」][,;:?!](?![a-z\d/])/g;
    while ((m = re.exec(s.text))) half.push(where + s.text.slice(Math.max(0, m.index - 10), m.index + 10));
  });
});

R.section("學生看得到的文字");
R.ok(count > 500, "掃到 " + count + " 段中文字串（太少表示掃描器壞了）", "只有 " + count);
R.ok(dash.length === 0, "沒有破折號「——」（" + dash.length + " 處）", dash.slice(0, 10).join("\n      "));
R.ok(half.length === 0, "中文句子沒有半形標點（" + half.length + " 處）", half.slice(0, 10).join("\n      "));

R.section("掃描器自己");
const probe = jsStrings([
  "const a = '甲——乙'; // 註解——不算",
  "/* 區塊——註解 */ const r = /[\"'`]—/g, b = `樣板${x ? \"內層\" : '另一個'}尾巴`;",
  "const c = 4 / 2 / 1, d = \"除號後面的字串\";"
].join("\n")).map(s => s.text);
R.ok(probe.includes("甲——乙") && !probe.some(t => /註解/.test(t)), "抓得到字串、略過註解", JSON.stringify(probe));
R.ok(probe.includes("內層") && probe.includes("另一個") && probe.includes("尾巴") && probe.includes("除號後面的字串"),
  "樣板字串、${} 裡的字串、除號都處理正確", JSON.stringify(probe));
R.done();
