/*
 * em-test.js — 變壓器與交流發電機
 *
 * 兩個實驗共同的教學重點都是「因果方向」與「反直覺的那一刻」：
 *   變壓器：電壓是原→副，電流卻是副→原
 *   發電機：磁通量最大的那一刻，電動勢恰好是零
 * 所以測試不只驗公式，也驗這兩件事在讀數上真的成立。
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
  return {
    root, ctx, api,
    set(label, v) {
      const s = (ctx.sliders || []).find(x => x.label === label);
      if (!s) throw new Error(id + " 找不到控制項：" + label);
      s.write(v); if (api.rerender) api.rerender();
    },
    get(label) {
      const r = (ctx.readouts || []).find(x => x.label === label);
      return r ? r.number : null;
    },
    chip(text) {
      const all = [];
      (function walk(n) { all.push(n); (n.children || []).forEach(walk); })(root);
      const b = all.find(n => n.tagName === "BUTTON" && String(n.textContent).trim() === text);
      if (b) { b.dispatch("click", {}); if (api.rerender) api.rerender(); }
      return !!b;
    },
    verdict() {
      const v = root.querySelectorAll(".sim-verdict-text")[0];
      return v ? v.textContent : "";
    },
    stop() { if (api && api.stop) api.stop(); }
  };
}

R.section("變壓器：理想變壓器的四條關係");
{
  const s = open("transformer");
  s.set("原線圈匝數 n₁", 200); s.set("副線圈匝數 n₂", 400);
  s.set("輸入電壓 U₁", 220); s.set("負載電阻 R", 440);
  R.ok(Math.abs(s.get("副線圈電壓 U₂") - 440) < 1e-6, "U₂ = U₁·n₂/n₁ = 440 V",
    "得 " + PL.fmt(s.get("副線圈電壓 U₂"), 2));
  R.ok(Math.abs(s.get("副線圈電流 I₂") - 1) < 1e-6, "I₂ = U₂/R = 1 A",
    "得 " + PL.fmt(s.get("副線圈電流 I₂"), 3));
  R.ok(Math.abs(s.get("原線圈電流 I₁") - 2) < 1e-6, "I₁ = I₂·n₂/n₁ = 2 A",
    "得 " + PL.fmt(s.get("原線圈電流 I₁"), 3));
  R.ok(Math.abs(s.get("功率 P₁ = P₂") - 440) < 1e-6, "P = U₂I₂ = 440 W",
    "得 " + PL.fmt(s.get("功率 P₁ = P₂"), 2));

  R.section("變壓器：功率守恆 U₁I₁ = U₂I₂（多組匝數比抽驗）");
  const bad = [];
  [[100, 400], [400, 100], [200, 200], [60, 180]].forEach(([n1, n2]) => {
    s.set("原線圈匝數 n₁", n1); s.set("副線圈匝數 n₂", n2);
    const p1 = s.get("原線圈電流 I₁") * 220;
    const p2 = s.get("副線圈電壓 U₂") * s.get("副線圈電流 I₂");
    if (Math.abs(p1 - p2) > 1e-6) bad.push(n1 + ":" + n2 + " → " + PL.fmt(p1, 2) + " ≠ " + PL.fmt(p2, 2));
  });
  R.ok(bad.length === 0, "四組匝數比都滿足 P₁ = P₂", bad.join("；"));

  R.section("變壓器：因果方向");
  s.set("原線圈匝數 n₁", 200); s.set("副線圈匝數 n₂", 200); s.set("負載電阻 R", 440);
  const u2a = s.get("副線圈電壓 U₂"), i1a = s.get("原線圈電流 I₁");
  s.set("負載電阻 R", 110);        // 負載變重
  R.ok(Math.abs(s.get("副線圈電壓 U₂") - u2a) < 1e-6,
    "換負載不改變 U₂（電壓由原邊決定）", PL.fmt(u2a, 1) + " → " + PL.fmt(s.get("副線圈電壓 U₂"), 1));
  R.ok(s.get("原線圈電流 I₁") > i1a * 3.5,
    "負載變重 → I₁ 跟著變大（電流由副邊決定）",
    PL.fmt(i1a, 2) + " A → " + PL.fmt(s.get("原線圈電流 I₁"), 2) + " A");

  R.section("變壓器：直流與空載");
  R.ok(s.chip("直流 ="), "找得到直流切換");
  R.ok(Math.abs(s.get("副線圈電壓 U₂")) < 1e-9, "直流輸入 → 副邊沒有電壓",
    "得 " + s.get("副線圈電壓 U₂"));
  R.ok(/直流/.test(s.verdict()), "判定指出直流不會有輸出", s.verdict());
  s.chip("交流 ~");
  s.chip("空載");
  R.ok(s.get("副線圈電壓 U₂") > 0 && Math.abs(s.get("副線圈電流 I₂")) < 1e-9,
    "空載 → 有電壓、沒有電流",
    "U₂ = " + PL.fmt(s.get("副線圈電壓 U₂"), 1) + " V，I₂ = " + s.get("副線圈電流 I₂"));

  R.section("變壓器：因果面板存在且三列");
  R.ok(s.root.querySelectorAll(".sim-causality-row").length === 3, "三列制約關係");
  R.ok(s.root.querySelectorAll(".sim-preset").length >= 3, "升壓／降壓／隔離預設");
  s.stop();
}

R.section("交流發電機：E₀ = nBAω");
{
  const s = open("ac-generator");
  const A = 0.02;
  [[50, 0.5, 3], [100, 1.0, 2], [20, 2.0, 8]].forEach(([n, B, w]) => {
    s.set("匝數 n", n); s.set("磁感應強度 B", B); s.set("角速度 ω", w);
    const want = n * B * A * w;
    R.ok(Math.abs(s.get("峰值 E₀ = nBAω") - want) < 1e-9,
      "n=" + n + " B=" + B + " ω=" + w + " → E₀ = " + PL.fmt(want, 3),
      "得 " + PL.fmt(s.get("峰值 E₀ = nBAω"), 3));
  });
  R.ok(Math.abs(s.get("有效值 E₀/√2") - s.get("峰值 E₀ = nBAω") / Math.SQRT2) < 1e-9,
    "有效值 = 峰值 / √2");
  R.ok(Math.abs(s.get("週期 T") - 2 * Math.PI / 8) < 1e-9, "T = 2π/ω");

  R.section("交流發電機：中性面的磁通量最大，但電動勢為零");
  s.set("匝數 n", 50); s.set("磁感應強度 B", 0.5); s.set("角速度 ω", 3);
  // 建置後 t = 0 就在中性面
  R.ok(Math.abs(s.get("瞬時電動勢 e")) < 1e-9, "中性面 e = 0",
    "得 " + s.get("瞬時電動勢 e"));
  R.ok(Math.abs(s.get("磁通量 Φ（單匝）") - 0.5 * 0.02) < 1e-9,
    "中性面 Φ 為最大值 BA = 0.01 Wb", "得 " + PL.fmt(s.get("磁通量 Φ（單匝）"), 4));
  R.ok(Math.abs(s.get("轉角 θ（從中性面起）")) < 1e-9, "轉角從中性面起算為 0°");
  R.ok(/中性面/.test(s.verdict()), "判定指出正在通過中性面", s.verdict());

  R.section("交流發電機：轉四分之一週期後 e 達峰值、Φ 歸零");
  {
    const loop = (s.ctx.loops || [])[0];
    const quarter = (2 * Math.PI / 3) / 4;
    for (let i = 0; i < Math.round(quarter * 200); i++) loop.stepOnce(1 / 200);
    if (s.api.rerender) s.api.rerender();
    R.ok(Math.abs(Math.abs(s.get("瞬時電動勢 e")) - s.get("峰值 E₀ = nBAω")) < 0.02,
      "四分之一週期後 |e| 達峰值",
      PL.fmt(Math.abs(s.get("瞬時電動勢 e")), 3) + " vs " + PL.fmt(s.get("峰值 E₀ = nBAω"), 3));
    R.ok(Math.abs(s.get("磁通量 Φ（單匝）")) < 0.0005, "同一刻 Φ 過零",
      "得 " + PL.fmt(s.get("磁通量 Φ（單匝）"), 5));
  }

  R.section("交流發電機：圖層開關存在");
  R.ok(s.root.querySelectorAll(".chip").length >= 4, "四個疊加層開關");
  s.stop();
}

R.done();
