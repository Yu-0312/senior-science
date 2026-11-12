/*
 * ja-test.js — 日文版（ja/）：每個字串都有翻譯、ja/ 是最新的、日文不要寫得像機器產生的
 *
 * 日文版是 tools/build-ja.js 依 i18n/ja.json 從中文原始碼產生的。
 * 這支守三件事：
 *   1. 中文版新增或改了字串，字典也要補上（否則日文版會混進中文）。
 *   2. ja/ 和「現在重跑 build-ja」的結果一模一樣（改了中文忘了重跑，就會失敗）。
 *   3. 日文的寫法：不用「——」，不用「〜しましょう」「ぜひ」「することができます」「様々な」，
 *      不留中文才有的字（這、們、說、還…）。
 */
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { reporter } = require("./_lib.js");
const R = reporter();

const ROOT = path.resolve(__dirname, "..", "..");
const BUILD = path.join(ROOT, "tools", "build-ja.js");
const DICT = path.join(ROOT, "i18n", "ja.json");

if (!fs.existsSync(BUILD) || !fs.existsSync(DICT)) {
  R.section("日文版");
  R.ok(true, "這個站沒有日文版，略過");
  R.done();
  return;
}

R.section("每個字串都有日文");
let coverage = "";
try {
  coverage = execFileSync(process.execPath, [BUILD, "--check"], { cwd: ROOT, encoding: "utf8" });
  R.ok(true, coverage.trim());
} catch (e) {
  R.ok(false, ((e.stdout || "") + "").trim() + "（跑 node tools/build-ja.js --todo 看缺哪些）");
}

R.section("ja/ 是最新的");
function listFiles(dir, base = dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  fs.readdirSync(dir, { withFileTypes: true }).forEach(d => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) listFiles(p, base, out); else out.push(path.relative(base, p).split(path.sep).join("/"));
  });
  return out;
}
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ja-test-"));
try {
  execFileSync(process.execPath, [BUILD, "--out", tmp], { cwd: ROOT, stdio: "ignore" });
  const fresh = listFiles(tmp).sort();
  const onDisk = listFiles(path.join(ROOT, "ja")).sort();
  const missing = fresh.filter(f => !onDisk.includes(f));
  const extra = onDisk.filter(f => !fresh.includes(f));
  const stale = fresh.filter(f => onDisk.includes(f) &&
    !fs.readFileSync(path.join(tmp, f)).equals(fs.readFileSync(path.join(ROOT, "ja", f))));
  R.ok(!missing.length, "ja/ 沒有缺檔案" + (missing.length ? "：" + missing.slice(0, 5).join("、") : ""));
  R.ok(!extra.length, "ja/ 沒有多出來的舊檔案" + (extra.length ? "：" + extra.slice(0, 5).join("、") : ""));
  R.ok(!stale.length, "ja/ 的 " + fresh.length + " 個檔案都和重跑的結果相同" +
    (stale.length ? "；過期：" + stale.slice(0, 5).join("、") + "（跑 node tools/build-ja.js）" : ""));
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

R.section("日文的寫法");
const dict = JSON.parse(fs.readFileSync(DICT, "utf8"));
const values = Object.keys(dict).map(k => ({ zh: k, ja: dict[k] }));
const RULES = [
  [/——/, "破折號「——」"],
  [/しましょう/, "「〜しましょう」"],
  [/ぜひ/, "「ぜひ」"],
  [/することができ/, "「〜することができます」（寫「〜できます」）"],
  [/様々|さまざまな/, "「様々な」"],
  [/[，；]/, "中文標點「，」「；」（日文用「、」「。」）"],
  // 中文才有的字形（日文寫成 这→この、说→説、还→まだ…），出現就是沒翻乾淨
  [/[這們說還讓從對嗎呢麼沒與發轉輕數樣圖單氣壓實驗學會錄將條變裡應覺讀寫擇顯點號體傳擺彈簧顆壞燒燈鐵鋁鈾氫氦碼錶]/, "中文字形"],
];
RULES.forEach(([re, name]) => {
  const bad = values.filter(v => re.test(v.ja));
  R.ok(!bad.length, "沒有" + name + (bad.length ? "：" + bad.slice(0, 3).map(v => "「" + v.ja.slice(0, 30) + "」").join("、") : ""));
});
const excl = values.filter(v => /！/.test(v.ja) && !/！/.test(v.zh));
R.ok(!excl.length, "中文沒有驚嘆號的地方，日文也不加「！」" + (excl.length ? "：" + excl.slice(0, 3).map(v => v.ja.slice(0, 20)).join("、") : ""));

R.done();
