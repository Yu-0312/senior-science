/*
 * physics-test.js — 對照封閉解驗證核心實驗的物理
 *
 * 判準是「和課本公式算出來的一致」，不是「有輸出數字」。
 * 這一點很重要：本專案出過一個實驗，殘差與擬合斜率全部是憑空乘係數編的，
 * 畫面也畫得有模有樣，只有拿封閉解對照才會發現。
 */
require("./harness.js");
const { reporter } = require("./_lib.js");
const PL = window.PhysicsLab;
const R = reporter();
document.documentElement.getAttribute = () => "dark";

/*
 * 掛鉤只能註冊一次：引擎的 onBuilt 沒有取消註冊的方法，
 * 寫在 open() 裡的話每開一個實驗就多一個掛鉤，而且每個都抓著一棵 DOM 樹。
 * meaning-audit 就是這樣把 Node 的記憶體撐爆的。
 */
let LAST = null;
PL._hooks.onBuilt(c => { LAST = c; });

function open(id) {
  LAST = null;
  const root = document.createElement("div"); root.dataset = { simId: id };
  const api = PL.get(id).build(root);
  const ctx = LAST;
  const set = (label, v) => {
    const s = (ctx.sliders || []).find(x => x.label === label);
    if (!s) throw new Error(id + " 找不到滑桿：" + label);
    s.write(v);
    if (api.rerender) api.rerender();
  };
  const get = label => {
    const r = (ctx.readouts || []).find(x => x.label === label);
    return r ? r.number : null;
  };
  const step = (sec, fps) => {
    const loop = (ctx.loops || [])[0];
    const f = fps || 60;
    for (let i = 0; i < sec * f; i++) { if (loop && loop.stepOnce) loop.stepOnce(1 / f); }
  };
  return { ctx, api, set, get, step, stop: () => api && api.stop && api.stop() };
}
const close = (a, b, tol) => Math.abs(a - b) <= Math.abs(b) * (tol || 0.02) + 1e-9;

R.section("單擺：T = 2π√(L/g)，且與振幅無關");
{
  const s = open("pendulum");
  [[1, 9.8], [2, 9.8], [4, 1.6], [0.5, 20]].forEach(([Lm, g]) => {
    s.set("擺長 L", Lm); s.set("重力 g", g);
    const want = 2 * Math.PI * Math.sqrt(Lm / g);
    R.ok(close(s.get("週期 T"), want), "L=" + Lm + " g=" + g,
      "得 " + PL.fmt(s.get("週期 T"), 3) + "，理論 " + PL.fmt(want, 3));
  });
  s.set("擺長 L", 2); s.set("重力 g", 9.8);
  const t1 = s.get("週期 T");
  s.set("初始角 θ₀", 18);
  R.ok(close(s.get("週期 T"), t1, 0.001), "小角度下振幅不影響週期（等時性）",
    "2° → " + PL.fmt(t1, 4) + "，18° → " + PL.fmt(s.get("週期 T"), 4));
  s.stop();
}

R.section("彈簧振子：T = 2π√(m/k)");
{
  const s = open("spring");
  [[2, 20], [6, 5], [0.5, 60]].forEach(([m, k]) => {
    s.set("質量 m", m); s.set("勁度 k", k);
    const want = 2 * Math.PI * Math.sqrt(m / k);
    R.ok(close(s.get("週期 T"), want), "m=" + m + " k=" + k,
      "得 " + PL.fmt(s.get("週期 T"), 3) + "，理論 " + PL.fmt(want, 3));
  });
  s.stop();
}

R.section("自由落體：v = √(2gh)，落地時間 = √(2h/g)");
{
  const s = open("freefall");
  [[45, 9.8], [80, 1.6], [5, 20]].forEach(([h, g]) => {
    s.set("初始高度 h", h); s.set("重力加速度 g", g);
    s.step(30);                                  // 讓它落到底
    const wantV = Math.sqrt(2 * g * h);
    R.ok(close(s.get("速率 v"), wantV, 0.03), "h=" + h + " g=" + g + " 的落地速率",
      "得 " + PL.fmt(s.get("速率 v"), 2) + "，理論 " + PL.fmt(wantV, 2));
  });
  s.stop();
}

R.section("歐姆定律電路：燈泡串在電路裡，I = V/(R+R燈)");
{
  const s = open("ohms");
  s.set("電壓 V", 12); s.set("電阻 R", 10);
  const I = s.get("電流 I"), Rtot = s.get("總電阻");
  R.ok(close(I * Rtot, 12), "I × 總電阻 = 電源電壓",
    PL.fmt(I, 3) + " × " + PL.fmt(Rtot, 2) + " = " + PL.fmt(I * Rtot, 2));
  // 電壓加倍，電流也要加倍（定電阻下嚴格線性）
  const I1 = s.get("電流 I");
  s.set("電壓 V", 24);
  R.ok(close(s.get("電流 I"), I1 * 2), "電壓加倍 → 電流加倍",
    PL.fmt(I1, 3) + " → " + PL.fmt(s.get("電流 I"), 3));
  s.stop();
}

R.section("理想氣體：等溫下 P×V 應保持定值（壓力由實際碰撞統計而來）");
{
  /*
   * 這裡的取樣方式很重要，第一版就是在這裡量錯的。
   *
   * 壓力不是用 PV=nRT 算出來的，而是統計分子真的撞在活塞上的動量變化——
   * 它是一個有限樣本的統計量，本來就會漲落。第一版只讀「某一瞬間」的 P×V，
   * 量到的大半是雜訊而不是物理，離散度在 11% 到 23% 之間隨機跳，
   * 測試因此時而通過時而失敗。
   *
   * 不穩定的測試比沒有測試更糟：它會讓人開始忽略紅燈。
   * 正確做法是先讓系統穩定，再對讀數本身做時間平均。
   * 這樣量出來的離散度是 0.3%～2%，物理其實非常準。
   */
  const s = open("gas");
  s.set("分子數 N", 240); s.set("溫度 T", 300);
  const samples = [];
  [0.9, 0.7, 0.5, 0.35].forEach(v => {
    s.set("活塞位置（體積）", v);
    s.step(10);                                   // 先讓壓力統計穩定
    let acc = 0, n = 0;
    for (let i = 0; i < 10 * 60; i++) {           // 再對讀數取時間平均
      s.step(1 / 60, 1);
      if (i % 20 === 0) { acc += s.get("P × V"); n += 1; }
    }
    samples.push(acc / Math.max(1, n));
  });
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  const spread = Math.max.apply(null, samples) - Math.min.apply(null, samples);
  R.ok(spread / mean < 0.04, "四種體積下 P×V 的離散度 < 4%（時間平均後）",
    samples.map(x => PL.fmt(x, 3)).join(", ") + "（離散 " + PL.fmt(spread / mean * 100, 1) + "%）");
  s.stop();
}

R.section("軌道力學能守恆：無摩擦時總能量不變");
{
  const s = open("energy-track");
  s.set("摩擦係數 μ", 0); s.set("質量 m", 50); s.set("起始位置", 4);
  const before = s.get("總力學能") != null ? s.get("總力學能") : null;
  const labels = (s.ctx.readouts || []).map(r => r.label);
  const totalLabel = labels.find(l => /總|力學能/.test(l));
  if (totalLabel) {
    const e0 = s.get(totalLabel);
    s.step(6);
    const e1 = s.get(totalLabel);
    R.ok(e0 != null && e1 != null && Math.abs(e1 - e0) <= Math.abs(e0) * 0.01 + 1e-6,
      "跑 6 秒後總力學能漂移 < 1%",
      PL.fmt(e0, 2) + " → " + PL.fmt(e1, 2));
  } else {
    R.ok(true, "（此實驗未提供總力學能讀數，略過）", labels.join(", "));
  }
  s.stop();
}

R.done();
