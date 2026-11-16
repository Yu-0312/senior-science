/*
 * minify-test.js — 部署時拿掉註解與縮排（tools/minify.js），不能動到任何有意義的字元
 *
 * 這支工具沒有用現成的壓縮器（專案不帶 npm 相依），分詞是自己寫的。
 * 分詞器最容易出事的地方是「這個斜線是除號、正規表示式、還是註解的開頭」，
 * 以及字串、樣板字串裡長得像註解的內容。這裡用一組刁鑽的寫法把行為鎖住，
 * 再把整個網站實際會送出去的檔案全部跑一遍。
 */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const { spawnSync } = require("child_process");
const { reporter } = require("./_lib.js");
const M = require("../minify.js");
const R = reporter();
const ROOT = path.resolve(__dirname, "../..");

/* 測試片段是函式本體；包成一個可以獨立編譯的程式再交給工具 */
const wrap = code => "var __r = (function () {\n" + code + "\n})();";
const run = code => { const box = { JSON, Math }; vm.runInNewContext(code, box); return JSON.stringify(box.__r); };
/* 處理前後執行結果要一樣，註解真的不見了，行數也沒變 */
function same(name, body, gone) {
  const code = wrap(body);
  const r = M.strip("js", code, name);
  if (!r.ok) return R.ok(false, name, "被放棄：" + r.reason);
  let a, b, err = "";
  try { a = run(code); b = run(r.out); } catch (e) { err = e.message; }
  const clean = (gone || []).every(g => r.out.indexOf(g) < 0);
  return R.ok(!err && a !== undefined && a === b && clean && r.out.split("\n").length === code.split("\n").length, name,
    err || (a !== b ? a + " ≠ " + b : !clean ? "註解還在：" + r.out : ""));
}

R.section("斜線：除號、正規表示式、註解");
same("字串裡的 // 不是註解", 'var u = "http://example.com/a"; // 網址\nreturn u;', ["網址"]);
same("單引號字串裡的 /* 不是註解", "var u = '/* 不是註解 */'; /* 是註解 */ return u;", ["是註解 */ return"]);
same("正規表示式裡跳脫的 //", 'var s = "http://a//b".replace(/\\/\\//g, "|"); // 換掉\nreturn s;', ["換掉"]);
same("除號後面的行註解", "var a = 8, b = 2, c = 2; var d = a / b / c; // a / b // c\nreturn d;", ["a / b // c"]);
same("括號後面是除號", "var a = 3, b = 5; return (a + b) / 2; // 平均", ["平均"]);
same("中括號後面是除號", "var a = [8]; return a[0] / 2 /* 一半 */ / 2;", ["一半"]);
same("++ 後面是除號", "var a = 4; var b = a++ / 2; // 後置\nreturn [a, b];", ["後置"]);
same("return 後面是正規表示式", 'function f(s) { return /\\/\\/ x/.test(s); } // 註\nreturn [f("// x"), f("y")];', ["註"]);
same("字元類別裡的斜線與引號", 'return "a/b\'c\\"d".replace(/[/\'"]/g, "-"); // 類別', ["類別"]);
same("字元類別裡的 /*", 'return "a/*b".split(/[/*]+/).join("+"); /* 尾巴 */', ["尾巴"]);
same("typeof 後面的正規表示式", "return typeof /a\\/\\/b/; // 型別", ["型別"]);
same("三元與逗號後面的正規表示式", 'var t = true; return [t ? /a\\//.source : /b/.source, /c\\/\\//.source]; // 三元', ["三元"]);
same("行內區塊註解換成空白，不讓前後黏在一起", "var y = 3; return/* 中間 */y;", ["中間"]);
same("除號接著區塊註解", "var a = 6; return a /* 被除數 */ / /* 除數 */ 3;", ["被除數", "除數"]);

R.section("樣板字串");
same("樣板字串裡的 // 與 /* 原樣保留", "var x = 2; return `a // 不是註解 ${x /* 是註解 */ + 1} /* 不是 */`; // 尾", ["是註解 */ +", "尾"]);
same("巢狀樣板與物件大括號", "var o = { k: 1 }; return `a${ `b${ { v: o.k }.v /* 內層 */ }c // 字` }d`; // 外層", ["內層", "外層"]);
same("跨行樣板字串：縮排與內容一個字都不能少",
  "var s = `第一行\n    // 這行是內容\n      縮排要留著   \n  結尾`; // 尾巴\nreturn s;", ["尾巴"]);
same("跨行樣板裡的運算式有註解", "var n = 2; var s = `a\n  ${ n * /* 倍 */ 2 }\n  b`; return s;", ["倍"]);

R.section("行數與版面");
{
  const code = "/*\n * 檔頭說明\n */\n(function () {\n  \"use strict\";\n  // 整行註解\n  var a = 1;   // 行尾註解\n\n  /* 跨\n     兩行 */ var b = 2;\n  return a + b;\n})();";
  const r = M.strip("js", code, "x.js");
  R.ok(r.ok && r.out.split("\n").length === code.split("\n").length, "行數不變（線上報錯的行號對得上原始碼）");
  R.ok(r.ok && r.out.split("\n")[6] === "var a = 1;" && r.out.split("\n")[9] === "var b = 2;", "程式留在原本那一行，縮排與行尾註解拿掉", r.ok ? JSON.stringify(r.out.split("\n").slice(5, 10)) : r.reason);
  R.ok(r.ok && !/檔頭|整行|行尾|跨/.test(r.out), "註解全部拿掉");
  R.ok(r.ok && M.strip("js", r.out, "x.js").out === r.out, "再跑一次結果相同");
}

R.section("看不懂就放棄，不硬做");
R.ok(!M.strip("js", 'var s = "a\\\nb"; // 跨行字串', "x.js").ok, "反斜線續行的字串：放棄這個檔案");
R.ok(!M.strip("js", "var a = 1; /* 沒有結束", "x.js").ok, "沒有結束的區塊註解：放棄");
R.ok(!M.strip("js", "var a = `x ${ 1 ", "x.js").ok, "沒有結束的樣板字串：放棄");
R.ok(!M.strip("js", "var a = 1; // 註解\nvar b = ;", "x.js").ok, "處理後編譯不過（原檔本來就壞了）：放棄");
R.ok(!M.strip("css", "a { color: red; ", "x.css").ok, "CSS 大括號不成對：放棄");

R.section("CSS");
{
  const css = "/* 檔頭 */\n.a {\n  color: red;   /* 紅 */\n  background: url(http://x.test/a//b.png) /* 圖 */ no-repeat;\n  content: \"/* 不是註解 */ // 也不是\";\n}\n\n/* 多行\n   註解 */\n.b::after { content: '//'; background: url( \"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>\" ); }";
  const r = M.strip("css", css, "x.css");
  R.ok(r.ok, "處理得了", r.reason);
  if (r.ok) {
    R.ok(r.out.split("\n").length === css.split("\n").length, "行數不變");
    R.ok(!/檔頭|紅|圖 \*|多行/.test(r.out), "註解拿掉");
    R.ok(r.out.indexOf("url(http://x.test/a//b.png) no-repeat;") >= 0, "沒加引號的 url() 裡的 // 保留，後面的註解換成空白", r.out.split("\n")[3]);
    R.ok(r.out.indexOf('content: "/* 不是註解 */ // 也不是";') >= 0 && r.out.indexOf("content: '//';") >= 0, "字串裡的 /* 與 // 保留");
    R.ok(r.out.indexOf("xmlns='http://www.w3.org/2000/svg'") >= 0, "data URL 原樣保留");
    R.ok(r.out.split("\n")[2] === "color: red;", "縮排與行尾空白拿掉", JSON.stringify(r.out.split("\n")[2]));
  }
}

R.section("整個網站：每個會送出去的 JS／CSS 都處理得了");
{
  const files = M.targets(ROOT);
  const bad = [];
  let before = 0, after = 0;
  files.forEach(rel => {
    const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
    const r = M.strip(/\.css$/.test(rel) ? "css" : "js", src, rel);
    if (!r.ok) { bad.push(rel + "（" + r.reason + "）"); return; }
    before += src.length; after += r.out.length;
  });
  R.ok(files.length > 50, "找得到檔案（" + files.length + " 個，含 ja/）");
  R.ok(!bad.length, "沒有被放棄的檔案（行數相同、JS 可編譯、CSS 大括號成對）", bad.slice(0, 4).join("、"));
  R.ok(after < before * 0.92, "字元數至少少 8%", Math.round(before / 1024) + " KB → " + Math.round(after / 1024) + " KB");
  R.ok(files.indexOf("js/app.js") >= 0 && files.indexOf("css/style.css") >= 0 && files.indexOf("sw.js") >= 0 && !files.some(f => /^tools\//.test(f)),
    "範圍是 js/、css/、duo/、sw.js（與 ja/ 底下同樣的檔案），不含 tools/");
}

R.section("防呆：本機不會不小心把原始碼改掉");
{
  const env = Object.assign({}, process.env); delete env.VERCEL; delete env.CI;
  const probe = path.join(ROOT, "js/safe.js"), before = fs.readFileSync(probe, "utf8");
  const r = spawnSync(process.execPath, [path.join(ROOT, "tools/minify.js"), "--in-place"], { env, encoding: "utf8" });
  R.ok(/跳過/.test(r.stderr) && /--force/.test(r.stderr) && fs.readFileSync(probe, "utf8") === before, "不是部署環境（沒有 VERCEL／CI 環境變數）時，--in-place 什麼都不改");
  R.ok(r.status === 0, "而且回傳成功：這一步不能擋下上線", "exit " + r.status);
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "vercel.json"), "utf8"));
  R.ok(/node tools\/verify-static\.js && node tools\/minify\.js --in-place$/.test(cfg.buildCommand), "vercel.json：建置與驗證都跑完之後才縮小", cfg.buildCommand);
}

R.done();
