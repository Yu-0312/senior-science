/*
 * teaching-notes.js — 逐題的教學補充
 *
 * 為什麼集中在一個檔案：
 * 全站盤點發現 57 個實驗缺少「它自己的內容該有的教學鷹架」——
 * 有臨界條件卻沒有判定、是學生必做實驗卻沒有操作流程、
 * 多步計算卻沒把中間量攤開。這些內容需要逐題的專業判斷，
 * 自動生成只會產出空話。
 *
 * 但如果分散寫進 40 幾個實驗檔，就沒有人能一眼看完、也很難維持一致的用語。
 * 集中在這裡，等於把「這個站在教什麼」變成一份可以審閱的文件。
 *
 * 兩個原則（來自使用者這位物理教師的決定）：
 *
 *  1. 學生必做實驗的步驟寫「實體實驗室怎麼做」，不是「模擬裡怎麼拉滑桿」。
 *     模擬因此成為實驗課的預習工具：學生進實驗室前已經知道要量幾次、
 *     要作什麼圖、要從斜率求什麼。
 *
 *  2. 每一個都要寫誤差來源與注意事項。實驗課的重點本來就在這裡，
 *     學測的實驗題也幾乎都考這個——量到球心還是球頂、電流表內接還是外接。
 *
 * 方法類實驗（單位換算、實驗設計、誤差傳遞…）沒有自然的「成功／失敗」，
 * 因此改成自我檢核式：不判對錯，而是提示該檢查什麼。
 */
(function () {
  "use strict";
  const PL = window.PhysicsLab;
  if (!PL || !PL._hooks) return;

  /* 讀數存取：回傳數值與顯示字串，找不到就給 null */
  function reader(ctx) {
    return function (label) {
      const r = (ctx.readouts || []).find(x => x.label === label);
      if (!r) return { n: null, s: "" };
      return { n: r.number, s: String(r.value == null ? "" : r.value) };
    };
  }
  function sliderOf(ctx, label) {
    return (ctx.sliders || []).find(x => x.label === label) || null;
  }
  const val = (ctx, label, dflt) => {
    const s = sliderOf(ctx, label);
    return s ? s.read() : dflt;
  };

  /* =====================================================================
     判定徽章
     每一條都是這個實驗在物理上真正的成敗分野，不是硬湊的狀態列。
     ===================================================================== */
  const VERDICT = {
    /* --- 摩擦：靜止 vs 滑動，是這一整組實驗的核心判準 --- */
    "friction": r => {
      const s = r("狀態").s;
      if (/滑|動/.test(s)) return ["已經滑動：摩擦力變成動摩擦，比最大靜摩擦小", "bad"];
      return ["仍然靜止：靜摩擦力自動等於外力，還沒到上限", "ok"];
    },
    "wall-friction": r => {
      const f = r("實際摩擦力 f").n, max = r("最大靜摩擦").n;
      if (f == null || max == null) return null;
      return f <= max + 1e-9
        ? ["撐得住：所需摩擦力 " + PL.fmt(f, 1) + " N ≤ 最大靜摩擦 " + PL.fmt(max, 1) + " N", "ok"]
        : ["撐不住，物體下滑：所需 " + PL.fmt(f, 1) + " N > 上限 " + PL.fmt(max, 1) + " N", "bad"];
    },
    "table-hanger": r => {
      const a = r("系統加速度 a").n;
      if (a == null) return null;
      return Math.abs(a) < 1e-6
        ? ["靜止：最大靜摩擦足以抵住懸掛物的重量", "ok"]
        : ["開始運動：加速度 " + PL.fmt(a, 2) + " m/s²，摩擦力已不足以抵住", "warn"];
    },
    "stacked-block-friction": r => {
      const need = r("所需摩擦力").n, max = r("最大靜摩擦").n;
      if (need == null || max == null) return null;
      return need <= max + 1e-9
        ? ["上下一起走：所需 " + PL.fmt(need, 1) + " N ≤ 上限 " + PL.fmt(max, 1) + " N", "ok"]
        : ["上方物體會滑動：所需 " + PL.fmt(need, 1) + " N 超過上限 " + PL.fmt(max, 1) + " N", "bad"];
    },
    "incline-friction-coefficient": r => {
      const th = r("目前傾角 θ").n, tc = r("臨界角 θc").n;
      if (th == null || tc == null) return null;
      if (Math.abs(th - tc) < 0.5) return ["剛好在臨界角：再抬高一點就會滑", "warn"];
      return th < tc
        ? ["還沒滑：目前 " + PL.fmt(th, 1) + "° 小於臨界角 " + PL.fmt(tc, 1) + "°", "ok"]
        : ["已經滑動：超過臨界角 " + PL.fmt(tc, 1) + "°", "bad"];
    },
    "incline-applied-force": r => {
      const f = r("實際摩擦力").n, max = r("最大靜摩擦").n;
      if (f == null || max == null) return null;
      return Math.abs(f) <= max + 1e-9
        ? ["靜止：靜摩擦力還在能力範圍內", "ok"]
        : ["開始滑動：需要的摩擦力已超過最大靜摩擦", "bad"];
    },
    "two-rope-equilibrium": r => {
      const sum = r("鉛直分量合計").n;
      if (sum == null) return null;
      return Math.abs(sum) < 0.5
        ? ["平衡：兩繩鉛直分量合計恰好抵銷重量", "ok"]
        : ["不平衡：鉛直方向還差 " + PL.fmt(Math.abs(sum), 1) + " N", "warn"];
    },
    /* --- 彈性限度：課本一定會提醒，但模擬常常忽略 --- */
    "hookes-law": (r, ctx) => {
      const x = r("伸長量 x").n;
      const s = sliderOf(ctx, "伸長量 x") || sliderOf(ctx, "掛載質量 m");
      if (x == null) return null;
      const limit = s ? s.max * 0.75 : Infinity;
      return x <= limit
        ? ["在彈性限度內：F 與 x 成正比，斜率就是勁度 k", "ok"]
        : ["接近彈性限度：真實彈簧到這裡會開始偏離直線，甚至永久變形", "warn"];
    },
    /* --- 能量：摩擦有沒有把力學能吃掉 --- */
    "energy-track": r => {
      const q = r("熱能").n, tot = r("總能量").n;
      if (q == null || tot == null || tot <= 0) return null;
      return q < tot * 0.01
        ? ["力學能守恆：沒有摩擦，動能與位能此消彼長，總量不變", "ok"]
        : ["力學能不守恆：已有 " + PL.fmt(q / tot * 100, 0) + "% 變成熱能，回不去了", "warn"];
    },
    "vertical-circle": r => {
      const v = r("頂點速率").n, vm = r("過頂最小速率").n;
      if (v == null || vm == null) return null;
      if (Math.abs(v - vm) < 0.05) return ["剛好臨界：頂點繩張力恰為零", "warn"];
      return v > vm
        ? ["順利過頂：頂點速率 " + PL.fmt(v, 2) + " > 臨界 " + PL.fmt(vm, 2) + " m/s", "ok"]
        : ["過不了頂：速率不足 √(gr)，繩會鬆脫、物體脫離圓周", "bad"];
    },
    "simple-machine-efficiency": r => {
      const eff = r("有用輸出功").n, loss = r("摩擦損耗").n;
      if (eff == null || loss == null) return null;
      const ratio = eff / Math.max(1e-9, eff + loss);
      return ratio > 0.7
        ? ["效率 " + PL.fmt(ratio * 100, 0) + "%：多數的功都用在有用輸出上", "ok"]
        : ["效率只有 " + PL.fmt(ratio * 100, 0) + "%：大半的功被摩擦吃掉了", "warn"];
    },
    /* --- 光學：折射 vs 全反射 --- */
    "snell": r => {
      const t2 = r("折射角 θ₂").n, tc = r("臨界角 θc").n;
      if (t2 == null) return ["全反射：光完全折不出去", "bad"];
      if (tc != null && !isFinite(t2)) return ["全反射：入射角已超過臨界角 " + PL.fmt(tc, 1) + "°", "bad"];
      return ["有折射光：折射角 " + PL.fmt(t2, 1) + "°", "ok"];
    },
    "critical-angle": r => {
      const th = r("入射角 θ").n, tc = r("臨界角").n;
      if (th == null || tc == null) return null;
      if (Math.abs(th - tc) < 0.5) return ["剛好在臨界角：折射光沿著界面掠射", "warn"];
      return th < tc
        ? ["光折射出去：入射角 " + PL.fmt(th, 0) + "° 小於臨界角 " + PL.fmt(tc, 1) + "°", "ok"]
        : ["全反射：入射角超過臨界角 " + PL.fmt(tc, 1) + "°，光完全折不出去", "bad"];
    },
    "lens-displacement": r => {
      const img = r("光屏成像").s;
      if (/清晰|成像/.test(img) && !/未|不/.test(img)) return ["成像清晰：這是位移法的其中一個位置", "ok"];
      return ["尚未成像：移動透鏡直到光屏上出現清晰的像", "warn"];
    },
    "prism-spectrometer": r => {
      const dm = r("最小偏向角 Dₘ").n;
      if (dm == null) return null;
      return ["目前偏向角 " + PL.fmt(dm, 2) + "°：轉動稜鏡找出偏向角的最小值再讀數", "info"];
    },
    /* --- 電：過載與量測 --- */
    "household-circuit": r => {
      const load = r("負載率").n;
      if (load == null) return null;
      if (load > 100) return ["過載：斷路器會跳脫，這正是它存在的理由", "bad"];
      if (load > 80) return ["接近額定：負載率 " + PL.fmt(load, 0) + "%，再加電器就會跳脫", "warn"];
      return ["安全：負載率 " + PL.fmt(load, 0) + "%", "ok"];
    },
    "wire-resistivity": r => {
      const err = r("與公認值誤差").n;
      // 還沒記錄任何資料時 err 是 null——這時要給下一步的指示，不是一個破折號
      if (err == null) return ["先記錄幾組不同長度的資料，才能用斜率求電阻率", "info"];
      return Math.abs(err) < 5
        ? ["量得不錯：與公認值差 " + PL.fmt(Math.abs(err), 1) + "%", "ok"]
        : ["誤差偏大（" + PL.fmt(Math.abs(err), 1) + "%）：多記錄幾組不同長度再用斜率求 ρ", "warn"];
    },
    "iv-measurement": r => {
      const n = r("已記錄資料").n;
      if (n == null) return null;
      if (n < 3) return ["資料不足：至少記錄 5 組不同電壓，才有辦法作圖求斜率", "warn"];
      if (n < 5) return ["已記錄 " + n + " 組：再多幾組，斜率會更可靠", "warn"];
      return ["已記錄 " + n + " 組：可以作 U–I 圖，斜率就是電阻", "ok"];
    },
    "seismic-triangulation": r => {
      const n = r("量測紀錄").n;
      if (n == null) return null;
      return n >= 3
        ? ["三個測站以上：可以交會出震央位置", "ok"]
        : ["只有 " + n + " 個測站：圓still交不出唯一解，至少需要三站", "warn"];
    },
    "damped-oscillation": (r, ctx) => {
      const beta = r("阻尼 β").n;
      const w0 = val(ctx, "自然角頻率 ω₀", null);
      if (beta == null) return null;
      if (w0 == null) {
        return beta < 0.35
          ? ["欠阻尼：振幅逐漸衰減，但仍在來回振盪", "ok"]
          : ["阻尼很大：振幅衰減得非常快，接近不再振盪", "warn"];
      }
      if (Math.abs(beta - w0) < 0.02) return ["臨界阻尼：最快回到平衡且不過衝", "warn"];
      return beta < w0
        ? ["欠阻尼：仍會來回振盪，振幅逐漸衰減", "ok"]
        : ["過阻尼：不再振盪，緩慢爬回平衡位置", "bad"];
    },
    "photoelectric": (r, ctx) => {
      const k = r("最大動能 Kmax").n, f0 = r("底限頻率 f₀").n;
      const f = val(ctx, "入射光頻率 f", null);
      if (k == null) return null;
      if (k <= 1e-9) {
        return ["沒有光電子逸出：光的頻率低於底限頻率" +
          (f0 != null ? "（" + PL.fmt(f0, 2) + "）" : "") + "，再亮也沒用", "bad"];
      }
      return ["有光電子逸出：最大動能 " + PL.fmt(k, 2) + " eV。增加光強只會增加電子數，不會增加動能", "ok"];
    },
    "cosmic-distance-ladder": r => {
      const d = r("距離 d").n;
      if (d == null) return null;
      if (d < 0.05) return ["自我檢核：這個距離適合用視差法。造父變星與 Ia 超新星是給更遠天體用的", "info"];
      if (d < 20) return ["自我檢核：這個距離要靠造父變星這類標準燭光，視差已經量不到了", "info"];
      return ["自我檢核：這麼遠只剩 Ia 超新星與哈伯定律可用——每一階都建立在前一階的校準上", "info"];
    },
    /* --- 方法類：不判對錯，提示該檢查什麼 --- */
    "unit-conversion": r => {
      const k = r("換算倍率").n;
      if (k == null) return null;
      const mag = Math.round(Math.log10(Math.abs(k) || 1));
      return ["自我檢核：換算倍率是 10^" + mag + "。單位變小則數字變大——" +
        "算完先看數量級對不對，再看有效數字有沒有跟著改變", "info"];
    },
    "experimental-design": r => {
      const c = r("控制變因 c").n;
      return ["自我檢核：現在只改變了自變因，控制變因固定在 " +
        (c == null ? "設定值" : PL.fmt(c, 2)) +
        "。若同時改兩個變因，得到的差異就無法歸因給任何一個", "info"];
    },
    "error-propagation": r => {
      const a = r("面積相對不確定度").n, l = r("邊長相對不確定度").n;
      if (a == null || l == null) return null;
      return ["自我檢核：面積的相對不確定度是邊長的 " + PL.fmt(a / Math.max(1e-9, l), 1) +
        " 倍。平方關係會放大不確定度——結果要同時寫出數值與範圍", "info"];
    },
    "energy-forms": r => {
      const eff = r("轉換效率").n;
      if (eff == null) return null;
      return ["自我檢核：轉換效率 " + PL.fmt(eff, 0) + "%。剩下的並沒有消失，" +
        "而是變成熱散掉了——能量守恆，但可用的能量變少了", "info"];
    }
  };

  /* =====================================================================
     學生必做實驗的操作流程

     寫的是「拿到器材之後在實驗室怎麼做」，不是「在這個畫面上怎麼拉滑桿」。
     模擬因此成為實驗課的預習工具：學生進實驗室前已經知道要量幾次、
     要作什麼圖、要從斜率求什麼。

     每一個都附「鐵律」——實驗課真正的重點在誤差來源，
     學測的實驗題也幾乎都考這個。
     ===================================================================== */
  const PROCEDURE = {
    "pendulum-measure-g": {
      title: "實驗流程：單擺測重力加速度",
      steps: [
        "量<strong>擺長 L</strong>：從懸點量到<strong>球心</strong>，也就是線長加上球的半徑。",
        "拉開<strong>小於 10°</strong>放手。角度太大時 sinθ ≈ θ 不成立，週期會偏長。",
        "計時<strong>連續 20 次全振動</strong>的總時間，除以 20 得到 T。",
        "換 5～6 個不同的 L 重複，作 <strong>T²–L 圖</strong>。",
        "由斜率求 g：T² = (4π²/g)·L，所以 <strong>g = 4π² / 斜率</strong>。"
      ],
      rule: "擺長要量到<strong>球心</strong>不是球頂；計時要數<strong>多次</strong>再除，" +
        "才能把每次按碼錶的反應時間攤掉。只量一次的誤差可以到好幾個百分比。"
    },
    "spring-measure-k": {
      title: "實驗流程：測彈簧的勁度係數",
      steps: [
        "先記下不掛砝碼時指針的<strong>原始讀數</strong>，之後所有伸長量都以它為基準。",
        "逐次加掛砝碼，每次記錄<strong>總質量 m 與對應的伸長量 x</strong>。",
        "至少取 6 組，並確認最後幾組仍落在直線上（沒有超過彈性限度）。",
        "作 <strong>F–x 圖</strong>（F = mg），斜率即為勁度 k。",
        "再<strong>逐次卸下</strong>砝碼記錄一遍，比較上升與下降兩條線是否重合。"
      ],
      rule: "超過<strong>彈性限度</strong>後 F–x 不再是直線，而且彈簧會永久變形——" +
        "卸載後回不到原長。上下兩趟不重合就是已經拉壞了，那幾組資料不能用。"
    },
    "lens-focal-measurement": {
      title: "實驗流程：測凸透鏡焦距",
      steps: [
        "<strong>粗測</strong>：用遠處窗景在光屏上成像，此時屏距約等於 f，先有個概念。",
        "把物、透鏡、光屏排在光具座上，<strong>三者中心等高共軸</strong>。",
        "調整位置直到光屏上出現最清晰的像，記下<strong>物距 u 與像距 v</strong>。",
        "換 5 組以上不同的 u 重複。",
        "用 <strong>1/v 對 1/u 作圖</strong>，兩軸截距都是 1/f（直線斜率為 −1）。"
      ],
      rule: "三者<strong>不共軸</strong>是最常見的系統誤差，像會歪掉且判斷不出最清晰的位置。" +
        "另外 u 必須大於 f 才成實像，u < f 時光屏上永遠接不到像。"
    },
    "lens-displacement": {
      title: "實驗流程：位移法（共軛法）測焦距",
      steps: [
        "固定物與光屏，兩者距離 <strong>D 必須大於 4f</strong>，否則找不到成像位置。",
        "移動透鏡，會找到<strong>兩個</strong>都能成清晰像的位置（一個成放大像、一個成縮小像）。",
        "記下這兩個位置的距離 <strong>d</strong>。",
        "代入 <strong>f = (D² − d²) / (4D)</strong>。",
        "換不同的 D 重複幾次，取平均。"
      ],
      rule: "位移法的好處是<strong>不必量物距與像距</strong>——透鏡中心的位置很難準確測量，" +
        "而這個方法完全繞開它，只量兩個成像位置的相對距離。這是它比 1/u+1/v 法更準的原因。"
    },
    "lens": {
      title: "實驗流程：凸透鏡成像規律",
      steps: [
        "先確認焦距 f，並在光具座上標出 <strong>f 與 2f</strong> 的位置。",
        "把物依序放在 <strong>u > 2f、u = 2f、f < u < 2f、u = f、u < f</strong> 五個區間。",
        "每一個區間都在光屏上找像，記錄<strong>倒立／正立、放大／縮小、實像／虛像</strong>。",
        "u = f 時光屏上接不到像（平行光射出），u < f 時要從透鏡另一側<strong>用眼睛看</strong>虛像。",
        "整理成表格，對照 1/u + 1/v = 1/f 驗算。"
      ],
      rule: "<strong>虛像接不到光屏上</strong>。u < f 時不是實驗失敗，而是成正立放大虛像——" +
        "要移開光屏、從透鏡另一側直接觀察。這一點每年都考。"
    },
    "mirror": {
      title: "實驗流程：面鏡成像規律",
      steps: [
        "用平行光找出凹面鏡的<strong>焦點</strong>，量出焦距 f（約為曲率半徑的一半）。",
        "把物放在 <strong>u > 2f、u = 2f、f < u < 2f、u < f</strong> 各區間。",
        "凹面鏡在 u > f 時成實像，可用光屏承接；<strong>u < f 成正立放大虛像</strong>，要用眼睛看。",
        "換凸面鏡重做：不論物在哪裡，凸面鏡永遠成<strong>正立縮小虛像</strong>。",
        "以 1/u + 1/v = 1/f 驗算，並注意<strong>凸面鏡的 f 取負值</strong>。"
      ],
      rule: "符號規則是這一題最常錯的地方：<strong>凸面鏡焦距為負、虛像的像距為負</strong>。" +
        "算出負的像距不是算錯，正是「這是虛像」的意思。"
    },
    "iv-measurement": {
      title: "實驗流程：伏安法測電阻",
      steps: [
        "依電路圖接線，電流表<strong>串聯</strong>、電壓表<strong>並聯</strong>在待測電阻兩端。",
        "先把可變電阻調到<strong>最大</strong>再合上開關，避免一通電就過流。",
        "逐次調小可變電阻，記錄<strong>至少 6 組</strong>對應的 U 與 I。",
        "作 <strong>U–I 圖</strong>，若為直線則此電阻為定值電阻。",
        "由<strong>斜率</strong>求 R，不要用單一組的 U/I——那等於只量了一次。"
      ],
      rule: "電表接法要看待測電阻大小：<strong>大電阻用安培計內接</strong>（電流表誤差相對小）、" +
        "<strong>小電阻用安培計外接</strong>。接反了會產生系統誤差，而且圖形照樣是漂亮的直線，看不出來。"
    },
    "potential-terrain": {
      title: "操作檢核：讀懂這座地形",
      steps: [
        "先把兩顆電荷拖成<strong>一正一負</strong>：紅色山丘與藍色漏斗之間的「鞍部」就是電偶極場的特色。",
        "把探測點放在<strong>山丘頂</strong>：電位最大，但探測點若是電荷所在處本身就沒有意義——地形是「其他電荷」在該處造成的（本實驗以合成場呈現）。",
        "把探測點沿著<strong>同一條等高線</strong>移動：電位讀值不變——這就是等勢面的定義。",
        "把探測點從山丘往谷底移：電位下降，電場箭頭永遠指向<strong>下坡方向</strong>（E = −dV/dr）。",
        "把 q₁、q₂ 都調成同號再看一次：兩座山之間出現谷底，電場在谷底歸零——這是電場為零的平衡點。"
      ],
      rule: "電場與電位的關係是這座地形的核心：<strong>電場指向電位下降最陡的方向</strong>，" +
        "等勢面（等高線）越密的地方電場越強。沿等勢面移動電荷不做功——這是電位能觀念的幾何版。"
    },
    "circuit-sandbox": {
      title: "操作檢核：自由接線前先想清楚",
      steps: [
        "接線前先在腦中畫迴路：電池<strong>正極→開關→安培計→燈泡→負極</strong>，別邊接邊猜。",
        "安培計<strong>串聯</strong>在迴路裡、伏特計<strong>並聯</strong>在待測元件兩端——接反了儀表讀不到，還可能損壞。",
        "合上開關後盯著燈泡亮度與安培計：把滑動變阻器調大，電流怎麼變？",
        "把伏特計改接到滑動變阻器兩端，比較它和燈泡分到的電壓——串聯分壓看得見。",
        "挑戰：把電池兩極直接接起來（短路），看電流飆到多少——這就是實驗室禁止短路的原因。"
      ],
      rule: "任何時候都要先確認<strong>迴路完整、電表接法正確</strong>再合上開關。" +
        "短路時電流只受電池內阻限制（這裡約 15 A），實際電池會發熱損壞；" +
        "伏特計並聯、安培計串聯接反是實驗室最危險也最常見的錯誤。"
    },
    "wheatstone": {
      title: "實驗流程：惠斯登電橋測電阻",
      steps: [
        "接好電橋，把待測電阻 Rx 與標準電阻 Rs 分別接在兩臂。",
        "檢流計<strong>先串一個保護電阻</strong>，避免偏轉過大燒壞。",
        "移動滑動接點，找到<strong>檢流計指零</strong>的平衡位置。",
        "平衡後<strong>移除保護電阻</strong>再細調一次，提高靈敏度。",
        "由 <strong>Rx / Rs = L₁ / L₂</strong> 算出 Rx；交換 Rx 與 Rs 的位置再測一次取平均。"
      ],
      rule: "電橋的準確度來自「<strong>指零</strong>」而不是讀數值——指零時電流為零，" +
        "檢流計本身的刻度誤差完全不影響結果。這是它比伏安法準的根本原因。" +
        "平衡點應盡量落在<strong>滑線中段</strong>，兩端的相對誤差較大。"
    },
    "closed-circuit-emf": {
      title: "實驗流程：測電池的電動勢與內電阻",
      steps: [
        "電池串聯可變電阻與電流表，電壓表<strong>並聯在電池兩端</strong>。",
        "改變可變電阻，記錄<strong>至少 6 組</strong>對應的路端電壓 U 與電流 I。",
        "外電阻<strong>不要調得太小</strong>，以免電流過大使電池發熱、內阻改變。",
        "作 <strong>U–I 圖</strong>，得到一條下降的直線。",
        "<strong>縱軸截距 = 電動勢 ε，斜率的絕對值 = 內電阻 r</strong>（U = ε − Ir）。"
      ],
      rule: "電池用久了內阻會上升，所以整個實驗要<strong>盡快完成</strong>，" +
        "而且每組資料之間讓電池<strong>稍作休息</strong>。前後兩組資料若明顯不在同一直線上，" +
        "多半是電池在實驗過程中變了，不是量錯。"
    },
    "resistance-vs-temperature": {
      title: "實驗流程：電阻隨溫度的變化",
      steps: [
        "把待測金屬線圈浸入水浴，溫度計的<strong>感溫泡要靠近線圈</strong>，不要碰到容器壁。",
        "緩慢加熱，每升高約 10 °C 記錄一次<strong>溫度 T 與電阻 R</strong>。",
        "每次讀數前<strong>停止加熱並攪拌</strong>，等溫度穩定再讀——否則線圈與水並不同溫。",
        "作 <strong>R–T 圖</strong>，金屬在中溫區間近似直線。",
        "由 R = R₀(1 + αT) 求溫度係數 α：<strong>α = 斜率 / R₀</strong>。"
      ],
      rule: "加熱太快是最大的誤差來源：<strong>水溫已經上去了，線圈還沒跟上</strong>，" +
        "量到的是兩個不同溫度的東西。務必停火、攪拌、等穩定再讀。"
    },
    "resonance-tube-sound-speed": {
      title: "實驗流程：共鳴管測聲速",
      steps: [
        "把音叉敲響後<strong>橫置</strong>於管口上方，不要碰到管口。",
        "緩緩改變管內水位（或抽拉管長），聽到<strong>聲音明顯變大</strong>的位置就是共鳴。",
        "記下<strong>第一共鳴</strong>的管長 L₁，繼續調找出<strong>第二共鳴</strong>的 L₂。",
        "波長 <strong>λ = 2(L₂ − L₁)</strong>。",
        "由 <strong>v = fλ</strong> 求聲速，並與當時室溫下的理論值比較。"
      ],
      rule: "不要用 L₁ = λ/4 直接算——管口有<strong>管口修正</strong>（約 0.6 倍管半徑），" +
        "第一共鳴的位置本來就不在剛好 λ/4。用<strong>兩次共鳴的差</strong>可以把這個修正完全消掉，" +
        "這就是為什麼一定要找第二共鳴。"
    },
    "current-balance": {
      title: "實驗流程：電流天平測磁場",
      steps: [
        "通電<strong>之前</strong>先調整天平<strong>歸零</strong>，記下平衡狀態。",
        "通入電流 I，磁場對導線施力使天平失衡。",
        "加砝碼使天平<strong>回到原來的平衡位置</strong>，記下所加質量 m。",
        "此時 <strong>BIL = mg</strong>，可求出磁感應強度 B。",
        "改變 I 重複 5～6 次，作 <strong>mg–I 圖</strong>，由斜率求 B（斜率 = BL）。"
      ],
      rule: "有效長度 L 只算<strong>位於磁場中的那一段</strong>導線，不是整條導線。" +
        "另外導線必須與磁場<strong>垂直</strong>，否則要乘上 sinθ——這兩點是這個實驗最常見的失分處。"
    },
    "cathode-ray-em": {
      title: "實驗流程：測電子的荷質比 e/m",
      steps: [
        "先只加<strong>電場</strong>，記錄電子束的偏轉量。",
        "再只加<strong>磁場</strong>，觀察偏轉方向與電場時相反。",
        "同時施加兩者並調整大小，直到電子束<strong>回到不偏轉的直線</strong>。",
        "此時電力與磁力平衡：<strong>eE = evB</strong>，得速度 <strong>v = E/B</strong>。",
        "移除電場，由磁場中的圓半徑 r 求 <strong>e/m = v / (Br)</strong>。"
      ],
      rule: "電場與磁場必須<strong>互相垂直、且都垂直於電子束</strong>，速度選擇器才成立。" +
        "另外偏轉板電壓與加速電壓是<strong>兩回事</strong>，不要混用——" +
        "加速電壓決定電子多快，偏轉電壓決定它偏多少。"
    },
    "motion-sensor": {
      title: "實驗流程：超音波測距與位置–時間圖",
      steps: [
        "把感測器固定，正對要追蹤的物體，距離<strong>不小於 0.15 m</strong>（太近測不到）。",
        "確認感測器與物體之間<strong>沒有其他反射面</strong>，否則會抓到錯的回波。",
        "開始記錄，讓物體做等速、加速、折返等不同運動。",
        "由 <strong>位置–時間圖的斜率</strong>讀出速度，斜率變化即為加速度。",
        "與碼錶＋米尺的手動量測比較，看看兩者差多少。"
      ],
      rule: "超音波測的是<strong>回波往返時間</strong>，再乘聲速的一半。" +
        "所以聲速會隨溫度改變這件事直接影響結果——不同室溫下要重新校正。"
    },
    "distance-displacement": {
      title: "實驗流程：用打點計時器區分路程與位移",
      steps: [
        "紙帶穿過打點計時器接在滑車上，先<strong>啟動計時器再放開滑車</strong>。",
        "取一段點距<strong>清晰均勻</strong>的紙帶，捨棄開頭幾個擠在一起的點。",
        "選定<strong>每 5 個間隔</strong>為一個計時單位（50 Hz 下即 0.1 s），依序編號。",
        "分別量出<strong>每一段的長度</strong>（相加得路程）與<strong>起點到終點的直線距離</strong>（即位移）。",
        "讓滑車折返再做一次，比較兩者的差異。"
      ],
      rule: "路程是把每一段<strong>都加起來</strong>，位移只看<strong>終點減起點</strong>且<strong>帶方向</strong>。" +
        "折返之後兩者必定不同——這正是這個實驗要學生親手量出來的事。"
    },
    "unit-conversion": {
      title: "換算三步",
      steps: [
        "先寫出<strong>單位的定義關係</strong>（例如 1 km = 10³ m），不要憑印象記倍率。",
        "把原數乘上<strong>等於 1 的換算因子</strong>，讓不要的單位上下相消。",
        "檢查<strong>數量級</strong>：單位變小則數字變大，反之亦然。"
      ],
      rule: "換算<strong>不會改變有效數字的位數</strong>。1.5 km 換成 1500 m 時，" +
        "有效數字仍然是兩位，要寫成 1.5 × 10³ m 才不會被誤讀成四位。"
    }
  };

  /* =====================================================================
     因果面板（自動探測看不出來的那些）

     探測引擎只能量「拉這根滑桿、那個讀數怎麼變」。
     但物理裡最重要的因果常常不是滑桿量得出來的：
     作用力與反作用力是同時存在的一對、楞次定律的方向由「反抗變化」決定、
     慣性講的是「不需要力」。這些要用寫的。
     ===================================================================== */
  const CAUSALITY = {
    "freefall": { title: "誰決定落體的快慢", rows: [
      { name: "高度 h", tone: "a", note: "決定落地時間與速率：t = √(2h/g)、v = √(2gh)。高度變四倍，時間與速率都只變兩倍。" },
      { name: "重力 g", tone: "a", note: "同樣決定時間與速率。到月球（g 約 1.6）同樣的高度會落得慢很多。" },
      { name: "質量 m", tone: "b", note: "完全不影響。重的與輕的同時落地——因為重力大小與慣性大小都正比於質量，兩者在 a = F/m 裡消掉了。" }
    ]},
    "inertia": { title: "慣性講的是「不需要力」", rows: [
      { name: "初速", tone: "a", note: "決定它跑多遠、多久停下來，但不決定「會不會停」。" },
      { name: "摩擦力", tone: "b", note: "決定它停不停。摩擦為零時滑塊永遠等速前進——維持運動不需要力，改變運動才需要。" },
      { name: "常見誤解", tone: "c", note: "「有速度就一定有力在推」是錯的。等速直線運動的合力為零，力是用來改變速度的，不是維持速度的。" }
    ]},
    "collision2d": { title: "碰撞裡什麼守恆、什麼不守恆", rows: [
      { name: "總動量", tone: "a", note: "守恆，而且是<strong>分量各自守恆</strong>：x 方向與 y 方向要分開列式。這是二維碰撞與一維最大的差別。" },
      { name: "總動能", tone: "b", note: "只有彈性碰撞才守恆。非彈性碰撞的動能會變成形變與熱，但動量照樣守恆。" },
      { name: "碰撞角度", tone: "c", note: "由碰撞瞬間兩球中心的連線決定，不是由入射方向決定——正碰與偏碰的差別就在這裡。" }
    ]},
    "recoil": { title: "反衝：動量守恆的因果", rows: [
      { name: "總動量", tone: "a", note: "爆炸前為零，爆炸後仍為零：兩邊的 mv 大小相等、方向相反。這是「守恆」的意思。" },
      { name: "速度分配", tone: "b", note: "由質量比決定：M·v₁ = m·v₂，所以砲身越重、後座速度越小。砲彈的動量並沒有「憑空出現」。" },
      { name: "動能", tone: "c", note: "不守恆——爆炸把化學能轉成動能，總動能從零變成正值。動量守恆與動能守恆是兩回事。" }
    ]},
    "conservative": { title: "保守力與非保守力", rows: [
      { name: "重力做的功", tone: "a", note: "只看起點與終點的<strong>高度差</strong>，與走哪條路完全無關。這就是「保守力」的定義。" },
      { name: "摩擦做的功", tone: "b", note: "與<strong>路徑長度</strong>成正比。繞遠路就損失更多，而且永遠是負功、拿不回來。" },
      { name: "能否定義位能", tone: "c", note: "只有保守力才能定義位能。摩擦力沒有「摩擦位能」這種東西，因為它的功取決於路徑。" }
    ]},
    "newton-cooling": { title: "冷卻速率由什麼決定", rows: [
      { name: "溫差", tone: "a", note: "冷卻速率正比於物體與環境的<strong>溫差</strong>：越燙降溫越快，接近室溫後越降越慢。" },
      { name: "環境溫度", tone: "a", note: "決定最終會停在哪裡——物體只會趨近環境溫度，不會低於它。" },
      { name: "不是等速下降", tone: "b", note: "溫度隨時間是<strong>指數衰減</strong>不是直線。「每分鐘降幾度」這個說法在這裡不成立。" }
    ]},
    "polarization": { title: "偏振片的三個常見誤解", rows: [
      { name: "第一片", tone: "a", note: "不論入射的自然光偏振方向如何，通過後強度都變成一半——因為自然光各方向均勻分布。" },
      { name: "第二片", tone: "a", note: "遵守馬呂士定律 I = I₀cos²θ，θ 是兩片<strong>透振方向的夾角</strong>，不是與入射光的夾角。" },
      { name: "夾在中間的第三片", tone: "b", note: "兩片正交時完全消光，但中間<strong>插入</strong>一片 45° 反而又有光透出——這不是矛盾，因為每一片都會改變光的偏振方向。" }
    ]},
    "efield": { title: "電場、電位、電力線", rows: [
      { name: "電場方向", tone: "a", note: "由<strong>正電荷受力方向</strong>定義。電力線從正電荷出發、終止於負電荷，永遠不相交。" },
      { name: "等勢面", tone: "b", note: "永遠與電力線<strong>垂直</strong>。沿等勢面移動電荷不做功——這是判斷等勢面畫得對不對的方法。" },
      { name: "電場強弱", tone: "c", note: "看電力線的<strong>疏密</strong>，不是看長短。線越密的地方場越強。" }
    ]},
    "diode-rectifier": { title: "整流電路裡誰決定誰", rows: [
      { name: "二極體", tone: "a", note: "決定電流<strong>方向</strong>：只讓一個方向通過，因此把交流變成脈動直流。" },
      { name: "濾波電容", tone: "b", note: "決定<strong>漣波大小</strong>：電容越大，電壓下降得越慢，輸出越平穩。它不改變平均值的方向。" },
      { name: "負載", tone: "c", note: "負載越重（電阻越小），電容放電越快，漣波就越明顯——所以濾波效果與負載有關。" }
    ]},
    "current-field": { title: "電流的磁效應：方向怎麼定", rows: [
      { name: "電流方向", tone: "a", note: "決定磁場的<strong>環繞方向</strong>：右手握住導線，拇指指電流，四指的環繞方向就是 B。" },
      { name: "距離", tone: "a", note: "決定磁場<strong>強弱</strong>：長直導線的 B 與距離成反比，離兩倍遠只剩一半。" },
      { name: "磁場沒有起點終點", tone: "b", note: "磁力線是<strong>封閉曲線</strong>，不像電力線有正負端點——因為沒有磁單極。" }
    ]},
    "lenz": { title: "楞次定律：方向由「反抗」決定", rows: [
      { name: "感應電流方向", tone: "a", note: "永遠<strong>反抗磁通量的改變</strong>：磁鐵靠近就排斥它、遠離就吸引它。" },
      { name: "不是反抗磁場", tone: "b", note: "反抗的是<strong>變化</strong>不是磁場本身。磁鐵停著不動時磁通量再大，也沒有感應電流。" },
      { name: "為什麼一定是反抗", tone: "c", note: "若感應電流反而助長變化，磁鐵會自己越跑越快——能量憑空增加，違反能量守恆。楞次定律其實是能量守恆的結果。" }
    ]},
    "em-wave": { title: "電磁波的三個垂直", rows: [
      { name: "E 與 B", tone: "a", note: "互相<strong>垂直</strong>，而且同相位——同時到最大、同時為零。不是一個大時另一個小。" },
      { name: "傳播方向", tone: "a", note: "同時垂直於 E 與 B，由 E × B 的方向決定。三者構成右手系。" },
      { name: "速率", tone: "b", note: "真空中一律是 c，<strong>與頻率、波長、強度都無關</strong>。改變頻率只會改變波長（c = fλ）。" }
    ]},
    "ampere-force": { title: "安培力的大小與方向", rows: [
      { name: "電流與磁場的夾角", tone: "a", note: "F = BIL·sinθ。<strong>平行時力為零</strong>、垂直時最大——這是最常被忽略的一項。" },
      { name: "力的方向", tone: "b", note: "同時垂直於電流與磁場（左手定則／F = IL × B），不在電流方向上，也不在磁場方向上。" },
      { name: "有效長度", tone: "c", note: "L 只算<strong>位於磁場中</strong>的那一段導線，不是整條導線的長度。" }
    ]},
    /*
     * 這兩個實驗只有一到三根滑桿，探測引擎找不到「兩條以上的有效關係」，
     * 因此自動因果面板不會生成——但它們各自都有一個學生一定會搞錯的重點，
     * 所以手寫。
     */
    "ballistic-pendulum": { title: "彈道擺：兩個階段要分開算", rows: [
      { name: "第一階段", tone: "a", note: "子彈嵌入木塊是<strong>完全非彈性碰撞</strong>：動量守恆、動能不守恆（大量動能變成形變與熱）。用 mv = (m+M)V。" },
      { name: "第二階段", tone: "b", note: "合體後擺上去是<strong>力學能守恆</strong>：½(m+M)V² = (m+M)gh。這一段沒有能量損失。" },
      { name: "最常見的錯", tone: "c", note: "把兩個階段合起來用「能量守恆」一次算完——那會算出錯的初速，因為碰撞那一瞬間動能根本沒有守恆。" }
    ]},
    "rutherford": { title: "散射實驗真正的推論", rows: [
      { name: "瞄準參數 b", tone: "a", note: "決定散射角：<strong>b 越小、越接近正對，偏折越大</strong>。b 很大時幾乎直線通過。" },
      { name: "原子核電荷 Z", tone: "a", note: "決定庫侖斥力的強度。Z 越大，同樣的 b 會偏折得更多。" },
      { name: "推論的關鍵", tone: "b", note: "重點不是「大部分粒子直線通過」，而是<strong>極少數被反彈回來</strong>——" +
        "這在均勻分布的模型下機率幾乎為零，因此正電荷必定<strong>集中在極小的核</strong>裡。" }
    ]},
    "satellite": { title: "發射速率決定軌道形狀", rows: [
      { name: "小於圓速", tone: "a", note: "軌道是橢圓，而且<strong>發射點是遠地點</strong>——物體會往地球掉，速率太小就直接落回地面。" },
      { name: "等於圓速", tone: "a", note: "剛好維持圓形軌道（第一宇宙速度，約 7.9 km/s）。這是圓與橢圓的分界。" },
      { name: "超過脫離速度", tone: "b", note: "達到 √2 倍圓速（約 11.2 km/s）後軌道變成拋物線，再快就是雙曲線——<strong>一去不回</strong>。" }
    ]},
    "incline-friction-coefficient": { title: "臨界角測 μs 的因果", rows: [
      { name: "傾角", tone: "a", note: "決定重力沿斜面的分量。角度越大，下滑的趨勢越強。" },
      { name: "臨界角", tone: "b", note: "由<strong>接觸面的材質</strong>決定，tan θc = μs。這是這個實驗要測的量。" },
      { name: "質量", tone: "c", note: "完全不影響臨界角——mg 在等式兩邊同時出現而消掉。換更重的物體重測，臨界角一樣。" }
    ]}
  };

  /* =====================================================================
     衍生量卡：把中間量攤開
     ===================================================================== */
  const DERIVED = {
    "distance-displacement": [
      { label: "去程走的距離", unit: "m", hint: "第一段，全部算進路程" },
      { label: "回程走的距離", unit: "m", hint: "第二段，同樣算進路程" },
      { label: "路程 − |位移|", unit: "m", hint: "折返造成的差額，不折返時為 0" }
    ],
    "unit-conversion": [
      { label: "原數的數量級", hint: "10 的幾次方" },
      { label: "換算倍率", hint: "乘上這個因子" },
      { label: "結果的數量級", hint: "檢查它是否合理" }
    ],
    "wheatstone": [
      { label: "左臂長度比 L₁/L₂", hint: "滑線分成的兩段" },
      { label: "標準電阻 Rs", unit: "Ω", hint: "已知的比較基準" },
      { label: "Rx = Rs × L₁/L₂", unit: "Ω", hint: "平衡時才成立" }
    ],
    "dimensional-analysis": [
      { label: "長度的次方 L", hint: "等號兩邊要一致" },
      { label: "時間的次方 T", hint: "等號兩邊要一致" },
      { label: "量綱是否相符", hint: "不符就一定寫錯了" }
    ],
    "force-components": [
      { label: "水平分量 F cosθ", unit: "N", hint: "沿位移方向，會做功" },
      { label: "鉛直分量 F sinθ", unit: "N", hint: "垂直位移，不做功" },
      { label: "兩分量平方和開根號", unit: "N", hint: "應等於原力大小" }
    ],
    "truss-bridge": [
      { label: "支點反力", unit: "N", hint: "先由整體平衡求出" },
      { label: "節點受力數", hint: "每個節點列兩條方程" },
      { label: "最大桿件內力", unit: "N", hint: "決定要用多粗的桿" }
    ],
    "hohmann-transfer": [
      { label: "第一次點火 Δv₁", unit: "", hint: "從圓軌道進入橢圓" },
      { label: "第二次點火 Δv₂", unit: "", hint: "從橢圓進入目標圓軌道" },
      { label: "總 Δv", unit: "", hint: "兩次相加，決定燃料需求" }
    ]
  };

  /* 情境預設：這兩個實驗的關鍵操作點需要特別指出 */
  const PRESETS = {
    "work-energy": ctx => [
      { label: "阻力設為 0", hint: "淨功全部變成動能，功能定理最乾淨的情形",
        apply: () => { const s = sliderOf(ctx, "阻力 f"); if (s) s.write(0); } },
      { label: "阻力等於施力", hint: "淨功為零，速度不再改變",
        apply: () => {
          const f = sliderOf(ctx, "施力 F"), fr = sliderOf(ctx, "阻力 f");
          if (f && fr) fr.write(Math.min(fr.max, f.read()));
        } }
    ],
    "incline-friction-coefficient": ctx => [
      { label: "調到剛好要滑", hint: "臨界角就是這個實驗要測的量",
        apply: () => {
          const tc = (ctx.readouts || []).find(x => x.label === "臨界角 θc");
          const s = sliderOf(ctx, "傾角 θ") || sliderOf(ctx, "目前傾角 θ");
          if (tc && tc.number != null && s) s.write(tc.number);
        } },
      { label: "換一個質量重測", hint: "臨界角應該完全不變——這是本實驗最重要的結論",
        apply: () => {
          const m = sliderOf(ctx, "物體質量 m") || sliderOf(ctx, "質量 m");
          if (m) m.write(m.read() >= (m.min + m.max) / 2 ? m.min : m.max);
        } }
    ]
  };

  /* =====================================================================
     掛載
     ===================================================================== */
  function attach(ctx, api) {
    const id = ctx.id;
    const r = reader(ctx);
    let vd = null, poll = 0;

    const cz = CAUSALITY[id];
    if (cz && !(ctx.root.querySelector && ctx.root.querySelector(".sim-causality"))) {
      const host = ctx.root.querySelector(".sim-readout-panel") || ctx.root;
      PL.ui.causality(host, cz);
    }

    const dv = DERIVED[id];
    if (dv && !(ctx.root.querySelector && ctx.root.querySelector(".sim-derived"))) {
      const host = ctx.root.querySelector(".sim-readout-panel") || ctx.root;
      PL.ui.derived(host, dv);
    }

    const pf = PRESETS[id];
    if (pf && !(ctx.root.querySelector && ctx.root.querySelector(".sim-presets"))) {
      const host = ctx.root.querySelector(".sim-controls") || ctx.root;
      let opts = [];
      try { opts = pf(ctx) || []; } catch (e) { opts = []; }
      if (opts.length) PL.ui.presets(host, { label: "關鍵操作點", options: opts });
    }

    const proc = PROCEDURE[id];
    if (proc && !(ctx.root.querySelector && ctx.root.querySelector(".sim-procedure-card"))) {
      const host = ctx.root.querySelector(".sim-controls") || ctx.root;
      PL.ui.procedure(host, proc);
    }

    const vfn = VERDICT[id];
    if (vfn && !(ctx.root.querySelector && ctx.root.querySelector(".sim-verdict"))) {
      const host = ctx.root.querySelector(".sim-readout-panel") || ctx.root;
      vd = PL.ui.verdict(host, { label: "—" });
      const refresh = () => {
        let out = null;
        try { out = vfn(r, ctx); } catch (e) { out = null; }
        if (out) vd.set(out[0], out[1]);
      };
      refresh();
      /*
       * 判定必須跟著讀數更新，但實驗「進場不自動播放」時動畫迴圈不會跑，
       * 因此不能只靠 onTick。改用輕量輪詢：只讀幾個已經算好的數字，
       * 每 250 ms 一次，成本可以忽略，而且暫停時照樣正確。
       */
      poll = setInterval(refresh, 250);
      if (api && typeof api.stop === "function") {
        const orig = api.stop;
        api.stop = function () { clearInterval(poll); return orig.apply(this, arguments); };
      }
    }
  }

  PL._hooks.onBuilt((ctx, api) => {
    try { attach(ctx, api); } catch (e) { console.warn("教學補充掛載失敗：" + ctx.id, e); }
  });
})();
