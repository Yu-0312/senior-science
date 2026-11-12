/* 長度測量與量具讀數 —— 游標卡尺與螺旋測微器
 *
 * 為什麼要單獨做這一個：
 * 中學所有實驗裡，只有量具讀數是「規則本身就是考點」。學生算得出物理，
 * 卻在讀數多寫一位或少寫一位上失分，而且錯的理由完全不同——
 * 游標卡尺不估讀，螺旋測微器一定要估讀。這件事光看課本文字學不會，
 * 必須看著刻度、跟著步驟做一次。
 *
 * 設計上的關鍵決定：
 *
 *  1. 一定要有放大窗。
 *     50 分度游標的一格錯位是 0.02 mm。整支尺畫在畫布上時，
 *     1 mm 大約 8 px，0.02 mm 連半個像素都不到——不管畫得多精細都看不出來。
 *     真正的卡尺也是要湊近瞇著眼看，所以模擬本來就該提供這扇窗，
 *     而不是假裝整尺看得出來。
 *
 *  2. 讀數要拆開顯示。
 *     學生卡住的地方通常不是最後相加，而是「主尺該讀到哪條線」與
 *     「哪一格才叫共線」。把 M、k、k×精度 三個中間量攤開，
 *     等於把解題過程可視化。
 *
 *  3. 要有練習模式。
 *     認識儀器和會讀數是兩件事。練習模式把答案蓋住、隨機出題，
 *     學生先自己讀再對答案，而且會針對「多寫一位／少寫一位」給出專屬回饋。
 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, D = PL.draw, TAU = PL.TAU;
  const MC = () => PL.col("m-color", "#4dd0e1");

  /*
   * 金屬色必須隨主題走。
   * 第一版直接寫死鋼灰 #b9c2cd，在淺色紙感背景上很自然，
   * 但在深色實驗台上就是一大片刺眼的淺灰——量化稽核抓到它有 20400 px²，
   * 正是使用者一開始抱怨的「黑中帶白太突兀」。
   * 深色主題改用槍鐵灰，兩邊都像金屬，但都不會跳出來打人。
   */
  const METAL = {
    body:  () => PL.theme.isLight() ? "#b9c2cd" : "#4a545f",
    face:  () => PL.theme.isLight() ? "#cdd5de" : "#5a6672",
    slide: () => PL.theme.isLight() ? "#8fa0b4" : "#3d4854",
    frame: () => PL.theme.isLight() ? "#3a4450" : "#2a323c",
    anvil: () => PL.theme.isLight() ? "#c8ced6" : "#59636f",
    drum:  () => PL.theme.isLight() ? "#b6bec8" : "#4f5964",
    tick:  () => PL.theme.isLight() ? "rgba(22,32,46,0.78)" : "rgba(228,236,246,0.82)",
    label: () => PL.theme.isLight() ? "#2b3440" : "#dfe7f1"
  };

  /* splitmix32：出題用的亂數，相鄰種子也要給出不相關的題目 */
  function rng(seed) {
    let s = seed | 0;
    return function () {
      s = (s + 0x9e3779b9) | 0;
      let t = s ^ (s >>> 16); t = Math.imul(t, 0x21f0aaad);
      t = t ^ (t >>> 15); t = Math.imul(t, 0x735a2d97);
      return ((t = t ^ (t >>> 15)) >>> 0) / 4294967296;
    };
  }

  PL.register("vernier-micrometer", { build(root) {
    // 量具整尺要橫向鋪開：參數移到畫布下方
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet", instrument: false });
    const cv = PL.canvas.create(L.canvasWrap, 0.42, 900);

    let tool = "vernier";        // vernier | micrometer
    let divisions = 50;          // 游標分度：10 / 20 / 50
    let mode = "learn";          // learn 認識量具 | practice 讀數練習
    let value = 81.32;           // 目前的真實長度（mm）
    let seed = 20260802;
    let answered = null;         // 練習模式：學生按下的選項
    let shown = value;           // 畫面上量爪／螺桿實際停的位置（mm），播放時會移動
    let geo = {};

    /* ---------------- 量具規格 ---------------- */
    const VERNIER_MAX = 150;     // mm
    const MICRO_MAX = 25;        // mm
    const precision = () => tool === "vernier" ? 1 / divisions : 0.01;

    /*
     * 把長度拆成讀數的三個部分。
     * 游標：M 是游標 0 線左側最近的整毫米；k 是共線的格號。
     *   L = M + k × (1/n)，因此 k = (L − M) / 精度，且 k 必為整數 0..n−1。
     *   為了讓畫面與讀數永遠自洽，這裡先把 value 對齊到精度的整數倍。
     */
    function decompose(v) {
      const p = precision();
      const snapped = Math.round((v == null ? value : v) / p) * p;
      const M = Math.floor(snapped + 1e-9);
      const k = Math.round((snapped - M) / p);
      return { snapped, M, k, p };
    }

    /* 螺旋測微器：套管讀數以 0.5 mm 為階，微分筒 50 格對應 0.5 mm */
    function microParts(v) {
      const snapped = Math.round((v == null ? value : v) * 1000) / 1000;
      const halves = Math.floor(snapped / 0.5 + 1e-9);       // 露出的半毫米格數
      const sleeve = halves * 0.5;
      const thimble = (snapped - sleeve) / 0.01;             // 0..49.9…（含估讀）
      return { snapped, sleeve, thimble, halfShown: halves % 2 === 1 };
    }

    /* ---------------- 控制項 ---------------- */
    PL.ui.section(L.controls, "測定器具");
    const toolChips = PL.ui.chipGroup(L.controls, {
      value: "vernier",
      options: [
        { value: "vernier", label: "ノギス" },
        { value: "micrometer", label: "マイクロメーター" }
      ],
      onChange: v => {
        tool = v;
        value = tool === "vernier" ? 81.32 : 6.721;
        answered = null;
        syncDivisionVisibility();
        sValue.setRange(0, tool === "vernier" ? VERNIER_MAX : MICRO_MAX);
        sValue.set(value);
        // 換了一支量具：量爪位置直接跳到新讀數，不要從卡尺的 81 mm 一路滑到測微器的 6 mm
        act = null; follow.snap(); follow.value = shown = value; follow.target = value;
        draw();
      }
    });

    const divWrap = PL.el("div", "", L.controls);
    PL.ui.section(divWrap, "副尺の目盛り数（何桁まで読めるかを決める）");
    const divChips = PL.ui.chipGroup(divWrap, {
      value: "50",
      options: [
        { value: "10", label: "10 目盛り" },
        { value: "20", label: "20 目盛り" },
        { value: "50", label: "50 目盛り" }
      ],
      onChange: v => { divisions = Number(v); value = Math.round(value / precision()) * precision(); sValue.set(value); answered = null; draw(); }
    });
    function syncDivisionVisibility() { divWrap.style.display = tool === "vernier" ? "" : "none"; }

    PL.ui.section(L.controls, "モード");
    PL.ui.chipGroup(L.controls, {
      value: "learn",
      options: [
        { value: "learn", label: "器具を知る" },
        { value: "practice", label: "読む練習" }
      ],
      onChange: v => { mode = v; answered = null; if (v === "practice") newQuestion(); draw(); }
    });

    const sValue = PL.ui.slider(L.controls, {
      label: "ドラッグして読みを変える", min: 0, max: VERNIER_MAX, step: 0.001, value: 81.32,
      unit: "mm", digits: 2,
      onInput: v => { value = v; answered = null; draw(); }
    });

    /* 情境預設：這些是課本會特別提醒、學生也最常錯的位置 */
    PL.ui.presets(L.controls, {
      label: "よく出る位置",
      options: [
        { label: "ちょうど整数 mm", hint: "そろう目盛り k = 0。最後の桁の 0 も書く。省略しない",
          apply: () => { value = tool === "vernier" ? 42 : 7.000; sValue.set(value); answered = null; draw(); } },
        { label: "0.5 mm の線が見えたばかり", hint: "マイクロメーターでいちばん多いわな：スリーブの下の段の 0.5 mm の線が見えているか",
          apply: () => { tool === "micrometer" ? (value = 6.512) : (value = 42.5); sValue.set(value); answered = null; draw(); } },
        { label: "まん中でそろう", hint: "副尺のまん中あたりでそろうと、目盛りの番号をいちばん数えまちがえやすい",
          apply: () => { const p = precision(); value = 33 + Math.round((tool === "vernier" ? 24 : 25)) * p; sValue.set(value); answered = null; draw(); } },
        { label: "ランダムに 1 問", hint: "別の位置で自分で読んでみる",
          apply: () => { newQuestion(); draw(); } }
      ]
    });

    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "リセット", () => {
      tool = "vernier"; divisions = 50; value = 81.32; answered = null;
      toolChips.set && toolChips.set("vernier"); divChips.set && divChips.set("50");
      syncDivisionVisibility(); sValue.setRange(0, VERNIER_MAX); sValue.set(value); draw();
    }, { primary: true });

    PL.ui.note(L.controls,
      "ノギスのしくみは「副尺の n 目盛りが主尺の n−1 mm にちょうど等しい」ことです。だから副尺の 1 目盛りは主尺より 1/n mm 短くなっています。" +
      "2 つの尺を並べると、ぴったりそろう目盛りは 1 つだけです。その番号に 1/n をかけたものが、1 mm に満たない部分です。" +
      "目盛り数を 10 や 20 に変えて同じ位置を見てみます。精度は器具で決まるもので、計算で出すものではありません。");

    /* ---------------- 讀數輸出 ---------------- */
    const vd = PL.ui.verdict(L.readouts.parentNode || L.readouts, { label: "—" });

    const rMain = PL.ui.readout(L.readouts, { label: "主尺 M", unit: "mm" });
    const rK = PL.ui.readout(L.readouts, { label: "そろう目盛り k" });
    const rFine = PL.ui.readout(L.readouts, { label: "k × 精度", unit: "mm" });
    const rRead = PL.ui.readout(L.readouts, { label: "読み", unit: "mm" });

    const dv = PL.ui.derived(L.canvasWrap.parentNode, [
      { label: "器具の精度（最小目盛り）", unit: "mm", hint: "器具そのもので決まる" },
      { label: "小数第何位まで書くか", hint: "多く書いても少なく書いてもまちがい" },
      { label: "この桁は目分量か", hint: "ノギスは目分量で読まない／マイクロメーターは必ず目分量で読む" }
    ]);

    /* 放大窗：整尺看不出 0.02 mm 的錯位 */
    const mag = PL.ui.magnifier(L.canvasWrap.parentNode, {
      title: "読み取り用の拡大窓",
      mode: "説明モード · そろう目盛りに印をつけています",
      note: "尺全体を見ても 0.02 mm のずれはわかりません（半ピクセルにも満たない）。本物のノギスでも近づいて見るので、読むときはこの拡大窓を使います。",
      aspect: 0.30
    });

    /* 步驟教學：兩把量具的流程不同，切換時整段換掉 */
    let proc = null;
    function renderProcedure() {
      if (proc && proc.remove) proc.remove();
      const host = L.controls;
      proc = tool === "vernier"
        ? PL.ui.procedure(host, {
            title: "読み方の 3 ステップ（ノギス）",
            steps: [
              "<strong>主尺を読む</strong>：副尺の 0 の線のすぐ<strong>左</strong>にある目盛りを読み、整数 mm の M を得る。",
              "<strong>そろう目盛りを探す</strong>：副尺で主尺の目盛りと<strong>ぴったりそろう</strong>目盛りを見つけ、番号 k を記録する。",
              "<strong>たし合わせる</strong>：L = M + k × " + PL.fmt(precision(), 2) + " mm。小数第 " +
                (divisions === 10 ? "1" : "2") + " 位まで書く。"
            ],
            rule: "ノギスは<strong>目分量で読まない</strong>：最小目盛りまで読む。1 桁多く書くとかえってまちがい" +
              "（12.34 を 12.340 と書かない）。"
          })
        : PL.ui.procedure(host, {
            title: "読み方の 3 ステップ（マイクロメーター）",
            steps: [
              "<strong>スリーブを読む</strong>：見えている整数 mm を数え、さらに下の段で<strong>0.5 mm の線が見えているか</strong>を確かめる。",
              "<strong>シンブルを読む</strong>：基準線が何目盛り目にあるかを見て、目盛り数 N に 0.01 mm をかける。",
              "<strong>たし合わせて目分量で 1 桁読む</strong>：結果は小数第 3 位まで書き、最後の桁は目分量。"
            ],
            rule: "マイクロメーターは<strong>必ず目分量で読む</strong>：1 桁少なくてもまちがい（2.35 は 2.350 と書く）。"
          });
    }

    /* ---------------- 練習模式 ---------------- */
    let choices = [], correctIndex = 0, choiceBox = null;
    function newQuestion() {
      seed = (seed + 7919) | 0;
      const r = rng(seed);
      const p = precision();
      if (tool === "vernier") {
        const M = 5 + Math.floor(r() * (VERNIER_MAX - 20));
        const k = Math.floor(r() * divisions);
        value = M + k * p;
      } else {
        const halves = Math.floor(r() * 40);
        const n = Math.floor(r() * 50);
        const est = Math.round(r() * 9) / 10;         // 估讀那一位
        value = halves * 0.5 + n * 0.01 + est * 0.001;
      }
      value = Math.min(value, tool === "vernier" ? VERNIER_MAX : MICRO_MAX);
      sValue.set(value);
      answered = null;
      buildChoices();
    }
    function buildChoices() {
      const digits = tool === "vernier" ? (divisions === 10 ? 1 : 2) : 3;
      const truth = tool === "vernier" ? decompose().snapped : microParts().snapped;
      const right = truth.toFixed(digits);
      /*
       * 誘答選項刻意做成學生真正會犯的三種錯，而不是隨機亂數：
       *   · 多寫／少寫一位（位數錯）
       *   · 共線格數錯 1 格
       *   · 測微器漏看半毫米線（少 0.5 mm）——這是最經典的陷阱
       */
      const wrongs = tool === "vernier"
        ? [truth.toFixed(digits + 1), (truth + precision()).toFixed(digits), (truth - precision()).toFixed(digits)]
        : [truth.toFixed(2), (truth - 0.5).toFixed(3), (truth + 0.01).toFixed(3)];
      const all = [right].concat(wrongs.filter(w => w !== right)).slice(0, 4);
      const r = rng(seed ^ 0x5bf03635);
      for (let i = all.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        const t = all[i]; all[i] = all[j]; all[j] = t;
      }
      choices = all;
      correctIndex = all.indexOf(right);
      renderChoices();
    }
    function renderChoices() {
      if (choiceBox && choiceBox.remove) choiceBox.remove();
      if (mode !== "practice") { choiceBox = null; return; }
      choiceBox = PL.el("div", "sim-procedure-card", L.controls);
      const t = PL.el("div", "sim-procedure-card-title", choiceBox);
      t.textContent = "この位置の読みはいくつですか？";
      const list = PL.el("div", "sim-presets", choiceBox);
      choices.forEach((c, i) => {
        const b = PL.el("button", "sim-preset", list);
        b.type = "button";
        b.textContent = c + " mm";
        b.addEventListener("click", () => { answered = i; draw(); renderChoices(); });
        if (answered != null) {
          if (i === correctIndex) b.classList.add("is-active");
          if (i === answered && i !== correctIndex) b.style.borderColor = PL.col("danger");
        }
      });
      if (answered != null) {
        const fb = PL.el("p", "sim-magnifier-note", choiceBox);
        fb.textContent = answered === correctIndex
          ? "正解です。最後の桁に注意：" + (tool === "vernier"
              ? "ノギスは最小目盛りまでで止め、それより 1 桁多く書かない。"
              : "マイクロメーターは必ず 1000 分の 1 mm の桁まで目分量で読み、最後が 0 でも書く。")
          : feedbackFor(choices[answered]);
      }
    }
    function feedbackFor(picked) {
      const digits = tool === "vernier" ? (divisions === 10 ? 1 : 2) : 3;
      const truth = tool === "vernier" ? decompose().snapped : microParts().snapped;
      const dec = (picked.split(".")[1] || "").length;
      if (dec !== digits) {
        return dec > digits
          ? "桁が多すぎます。" + (tool === "vernier"
              ? "ノギスは目分量で読まず、最小目盛り " + PL.fmt(precision(), 2) + " mm までです。"
              : "マイクロメーターで目分量で読むのは 1 桁だけで、2 桁ではありません。")
          : "桁が足りません。" + (tool === "vernier"
              ? "最小目盛りは " + PL.fmt(precision(), 2) + " mm なので、小数をその桁まで書きます。"
              : "マイクロメーターは目分量で 1 桁読む必要があり、最後が 0 でも書きます。");
      }
      const diff = Number(picked) - truth;
      if (tool === "micrometer" && Math.abs(diff + 0.5) < 1e-6) {
        return "0.5 mm 足りません。スリーブの下の段の 0.5 mm の線がもう見えています。ここがいちばん見落としやすい所です。";
      }
      if (Math.abs(Math.abs(diff) - precision()) < 1e-9) {
        return "ちょうど 1 目盛りずれています。そろう目盛りの番号を数えまちがえているので、拡大窓でもう一度数えてください。";
      }
      return "拡大窓で緑色になっている目盛りをもう一度見てください。";
    }

    /* ---------------- 繪圖：游標卡尺 ---------------- */
    function drawVernier(ctx, W, H) {
      // 畫面上的游標停在 shown（播放時會滑動）；視窗位置跟著真實讀數 value，
      // 拖曳把手時凍結視窗，否則指標底下的尺一直捲動、手感會失控
      const d = decompose(shown), dv0 = decompose();
      const pad = 40;
      const mmPx = (W - pad * 2) / 96;                 // 畫面顯示約 96 mm 的區段
      const view0 = gripV.dragging && geo.view0 != null ? geo.view0 : Math.max(0, Math.min(VERNIER_MAX - 96, dv0.M - 74));
      geo = { view0, pad, mmPx };
      const X = mm => pad + (mm - view0) * mmPx;
      const barY = H * 0.40;

      // 主尺本體
      D.rect(ctx, pad - 26, barY, W - pad * 2 + 40, 34,
        { fill: METAL.body(), stroke: PL.theme.pale(0.35), r: 3 });
      D.rect(ctx, pad - 26, barY, W - pad * 2 + 40, 9, { fill: METAL.face() });
      // 固定爪
      D.rect(ctx, X(view0 + 2) - 12, barY + 34, 14, 54, { fill: METAL.body(), stroke: PL.theme.pale(0.35), r: 2 });
      // 主尺刻度：每 mm 一小格、每 5 mm 中格、每 10 mm 長格加數字
      for (let mm = Math.ceil(view0); mm <= view0 + 96; mm += 1) {
        const x = X(mm);
        if (x < pad - 24 || x > W - pad + 14) continue;
        const long = mm % 10 === 0, mid = mm % 5 === 0;
        D.line(ctx, x, barY + 9, x, barY + 9 + (long ? 17 : mid ? 12 : 8),
          METAL.tick(), long ? 1.4 : 1);
        if (long) {
          D.text(ctx, String(mm / 10), x, barY + 9 + 27,
            { color: METAL.label(), size: 10, align: "center", weight: "700" });
        }
      }
      D.text(ctx, "cm", W - pad + 4, barY + 30, { color: METAL.label(), size: 9.5 });

      // 游標本體（0 線對齊 snapped 值）
      const vLen = divisions === 10 ? 9 : divisions === 20 ? 19 : 49;   // 游標總長 = n−1 mm
      const vx = X(d.snapped);
      D.rect(ctx, vx - 10, barY + 30, vLen * mmPx + 22, 30,
        { fill: METAL.slide(), stroke: PL.theme.pale(0.45), r: 3 });
      // 活動爪
      D.rect(ctx, vx - 10, barY + 60, 14, 42, { fill: METAL.slide(), stroke: PL.theme.pale(0.45), r: 2 });
      // 游標刻度：n 格佔 n−1 mm
      const step = (vLen / divisions) * mmPx;
      for (let i = 0; i <= divisions; i += 1) {
        const x = vx + i * step;
        const tall = divisions === 50 ? i % 10 === 0 : i % 5 === 0;
        D.line(ctx, x, barY + 30, x, barY + 30 + (tall ? 16 : 10),
          i === d.k ? PL.col("ok") : METAL.tick(), i === d.k ? 2 : 1);
        if (tall && divisions !== 50) {
          D.text(ctx, String(i), x, barY + 30 + 26, { color: METAL.label(), size: 8.5, align: "center" });
        }
      }
      D.text(ctx, PL.fmt(precision(), 2) + " mm", vx + vLen * mmPx * 0.5, barY + 26,
        { color: METAL.label(), size: 9, align: "center" });

      // 測量物：長度就是讀數 value；量爪張開時（shown > value）兩者之間看得到空隙
      D.rect(ctx, X(view0 + 2) + 2, barY + 46, Math.max(2, X(dv0.snapped) - 12 - (X(view0 + 2) + 2)), 26,
        { fill: "rgba(120,140,165,0.35)", stroke: PL.theme.pale(0.3), r: 2 });
      // 把手抓活動爪：學生真的是用拇指推這一片
      gripV.place(vx - 3, barY + 88); gripM.hide();

      return d;
    }

    /* 游標卡尺的放大窗：只放大共線格附近的幾格 */
    function magVernier(c) {
      const { ctx, W, H } = c;
      c.clear(); D.bg(c);
      const d = decompose(shown);
      const span = divisions === 10 ? 6 : divisions === 20 ? 8 : 10;   // 放大顯示幾格游標
      const k0 = Math.max(0, Math.min(divisions - span, d.k - Math.floor(span / 2)));
      const vLenMm = divisions === 10 ? 9 : divisions === 20 ? 19 : 49;
      const perMm = (W - 60) / (span * vLenMm / divisions);
      const X = mm => 30 + (mm - (d.snapped + k0 * vLenMm / divisions)) * perMm;

      const topY = H * 0.14, botY = H * 0.56;
      D.rect(ctx, 22, topY - 6, W - 44, 30, { fill: PL.theme.shade(0.3), stroke: PL.theme.pale(0.26), width: 1, r: 4 });
      D.rect(ctx, 22, botY - 6, W - 44, 32, { fill: PL.theme.shade(0.18), stroke: PL.theme.pale(0.26), width: 1, r: 4 });
      D.text(ctx, "主尺", 28, topY + 8, { color: PL.col("text-faint"), size: 9 });
      D.text(ctx, "副尺", 28, botY + 8, { color: PL.col("text-faint"), size: 9 });

      // 主尺整毫米線
      const startMm = Math.floor(d.snapped + k0 * vLenMm / divisions) - 1;
      for (let mm = startMm; mm <= startMm + span + 2; mm += 1) {
        const x = X(mm);
        if (x < 24 || x > W - 24) continue;
        D.line(ctx, x, topY, x, topY + 22, PL.col("text-dim"), 1.2);
        D.text(ctx, String(mm), x, topY - 8, { color: PL.col("text-faint"), size: 8.5, align: "center" });
      }
      // 游標格線
      for (let i = k0; i <= k0 + span; i += 1) {
        const x = X(d.snapped + i * vLenMm / divisions);
        if (x < 24 || x > W - 24) continue;
        const hit = i === d.k;
        D.line(ctx, x, botY, x, botY + 24, hit ? PL.col("ok") : PL.col("text-dim"), hit ? 2.4 : 1.2);
        D.text(ctx, String(i), x, botY + 36,
          { color: hit ? PL.col("ok") : PL.col("text-faint"), size: 8.5, align: "center",
            weight: hit ? "700" : "400" });
      }
      // 共線指示：把上下兩條線連起來，「對齊」這件事才看得見
      if (mode === "learn") {
        const x = X(d.snapped + d.k * vLenMm / divisions);
        if (x > 24 && x < W - 24) {
          D.line(ctx, x, topY + 22, x, botY, PL.col("ok"), 1.4, [4, 3]);
          D.text(ctx, "そろう目盛り k = " + d.k, x + 6, (topY + botY) / 2 + 4,
            { color: PL.col("ok"), size: 10, weight: "700" });
        }
      }
    }

    /* ---------------- 繪圖：螺旋測微器 ----------------
     * 幾何照真的量具：砧座固定，測微螺桿與微分筒一起轉、一起前進。
     * 讀數 L 增加時，螺桿退出（砧座與螺桿之間的空隙 = L），
     * 微分筒的左緣同時沿套管往右移、多露出 L 那麼長的套管刻度——
     * 所以「套管露出多少」和「夾住的東西多厚」是同一個長度，學生看得到兩者一起變。
     * 微分筒上畫出 50 格中正對前方的那一半，基準線對到的那一格就是讀數。
     */
    function drawMicrometer(ctx, W, H) {
      const m = microParts(shown), mv = microParts();
      const cy = H * 0.5;
      const k = PL.clamp((Math.min(W, 900) - 230) / 50, 3, 12);     // 每 mm 幾 px
      const total = 160 + 50 * k, x0 = (W - total) / 2;
      const xa = x0 + 34;                         // 砧座端面
      const xsl = xa + 25 * k + 12;               // 套管起點（框架在這裡夾住套管）
      const xs0 = xsl + 8;                        // 套管上的 0 刻線
      const xT = xs0 + shown * k;                 // 微分筒左緣
      const xSp = xa + shown * k;                 // 螺桿端面
      // C 形框架
      ctx.save();
      ctx.strokeStyle = METAL.frame(); ctx.lineWidth = 18; ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath(); ctx.moveTo(xa - 14, cy - 8); ctx.lineTo(xa - 14, cy + 52); ctx.lineTo(xsl + 2, cy + 52); ctx.lineTo(xsl + 2, cy + 10); ctx.stroke();
      ctx.restore();
      D.text(ctx, "測定範囲 0 – 25 mm · 1 目盛り 0.01 mm", (xa + xsl) / 2, cy + 80, { color: PL.col("text-dim"), size: 10, align: "center" });
      // 砧座
      D.rect(ctx, xa - 24, cy - 12, 24, 24, { fill: METAL.anvil(), r: 2 });
      // 待測物：厚度就是讀數 value，夾在砧座與螺桿之間
      D.rect(ctx, xa, cy - 25, Math.max(2, mv.snapped * k), 50, { fill: "#c9a227", stroke: PL.theme.pale(0.3), r: 2 });
      // 測微螺桿（從套管伸出來）
      D.rect(ctx, xSp, cy - 9, Math.max(0, xsl - xSp), 18, { fill: METAL.anvil(), stroke: PL.theme.pale(0.3), r: 2 });
      // 固定套管與刻度：上排整毫米、下排半毫米（只看得到微分筒左緣以左的部分）
      // 套管右段收在微分筒裡面，只畫到微分筒左緣
      D.rect(ctx, xsl, cy - 13, Math.max(8, xT + 6 - xsl), 26, { fill: METAL.anvil(), stroke: PL.theme.pale(0.3), r: 3 });
      ctx.save(); ctx.beginPath(); ctx.rect(xsl, cy - 40, Math.max(0, xT - xsl), 80); ctx.clip();
      for (let i = 0; i <= 25; i += 1) {
        const x = xs0 + i * k;
        D.line(ctx, x, cy - (i % 5 === 0 ? 11 : 8), x, cy, METAL.tick(), 1.2);
        if (i % 5 === 0) D.text(ctx, String(i), x, cy - 15, { color: METAL.label(), size: 8.5, align: "center" });
        // 下排的半毫米線：錯開半格，這排就是最常被漏看的那一排
        if (i < 25) D.line(ctx, x + k / 2, cy, x + k / 2, cy + 8, METAL.tick(), 1.2);
      }
      ctx.restore();
      D.line(ctx, xsl, cy, xT + 2, cy, PL.col("danger"), 1.4);   // 基準線
      // 微分筒：圓周 50 格，轉一圈前進 0.5 mm
      const dw = 88, R = 27;
      D.rect(ctx, xT, cy - 31, dw, 62, { fill: METAL.drum(), stroke: PL.theme.pale(0.35), r: 5 });
      D.rect(ctx, xT, cy - 31, 5, 62, { fill: METAL.slide(), r: 2 });
      for (let i = 0; i < 50; i += 1) {
        const ph = (i - m.thimble) / 50 * TAU, cz = Math.cos(ph);
        if (cz < 0.12) continue;                   // 轉到背面的格線看不到
        const y = cy - R * Math.sin(ph), big = i % 5 === 0;
        ctx.globalAlpha = Math.min(1, cz * 1.6);
        D.line(ctx, xT + 5, y, xT + 5 + (big ? 13 : 8), y, METAL.tick(), 1);
        if (big && cz > 0.55) D.text(ctx, String(i), xT + 21, y + 3, { color: METAL.label(), size: 8.5 });
        ctx.globalAlpha = 1;
      }
      // 棘輪旋柄：學生真的是轉這裡
      D.rect(ctx, xT + dw, cy - 15, 24, 30, { fill: METAL.slide(), stroke: PL.theme.pale(0.35), r: 4 });
      for (let i = 1; i < 6; i += 1) D.line(ctx, xT + dw + i * 4, cy - 13, xT + dw + i * 4, cy + 13, PL.theme.pale(0.25), 1);
      geo = { xs0, k };
      gripM.place(xT + dw + 12, cy); gripV.hide();
      return m;
    }

    function magMicrometer(c) {
      const { ctx, W, H } = c;
      c.clear(); D.bg(c);
      const m = microParts(shown);
      const baseY = H * 0.52;
      // 固定套管：把整毫米與半毫米兩排分開畫，並標出半毫米是否露出
      const mm0 = Math.max(0, Math.floor(m.sleeve) - 1);
      const per = (W - 90) / 4;
      const X = v => 44 + (v - mm0) * per;
      D.rect(ctx, 30, baseY - 40, W - 60, 38, { fill: PL.theme.shade(0.28), stroke: PL.theme.pale(0.26), width: 1, r: 4 });
      D.rect(ctx, 30, baseY, W - 60, 34, { fill: PL.theme.shade(0.16), stroke: PL.theme.pale(0.26), width: 1, r: 4 });
      for (let i = 0; i <= 4; i += 1) {
        const x = X(mm0 + i);
        D.line(ctx, x, baseY - 34, x, baseY - 6, PL.col("text-dim"), 1.4);
        D.text(ctx, String(mm0 + i), x, baseY - 40, { color: PL.col("text-faint"), size: 9, align: "center" });
        const xh = X(mm0 + i + 0.5);
        if (xh < W - 32) {
          const shown = (mm0 + i + 0.5) <= m.sleeve + 1e-9;
          D.line(ctx, xh, baseY + 4, xh, baseY + 26,
            shown ? PL.col("warn") : PL.theme.pale(0.18), shown ? 2.4 : 1.2);
        }
      }
      D.text(ctx, "上の段：整数 mm", 34, baseY - 46, { color: PL.col("text-faint"), size: 9 });
      D.text(ctx, "下の段：0.5 mm（見えていたら +0.5）", 34, baseY + 46, { color: PL.col("text-faint"), size: 9 });
      // 目前套管讀數的位置
      const xs = X(m.sleeve);
      if (xs > 32 && xs < W - 32) {
        D.line(ctx, xs, baseY - 44, xs, baseY + 32, PL.col("ok"), 1.6, [4, 3]);
        D.text(ctx, "スリーブ " + PL.fmt(m.sleeve, 1) + " mm", xs + 6, baseY - 48,
          { color: PL.col("ok"), size: 10, weight: "700" });
      }
      // 微分筒格數
      D.text(ctx, "シンブル " + PL.fmt(m.thimble, 1) + " 目盛り × 0.01 = " + PL.fmt(m.thimble * 0.01, 3) + " mm",
        W - 34, baseY + 46, { color: PL.col("text-dim"), size: 10, align: "right" });
    }

    /* ---------------- 量測動作（播放時） ----------------
     * 按下播放就做一次「量一次」的手部動作：
     *   游標卡尺——推開活動爪、再慢慢合上夾住待測物。合上的過程中，放大窗裡
     *     「對齊的那一格」會沿著游標一路跑過去：爪子只動 0.02 mm，共線就跳一格，
     *     這正是游標能把 1 mm 細分成 n 份的原因。
     *   螺旋測微器——先退三圈（1.5 mm），再轉棘輪把螺桿旋進去，碰到待測物時棘輪打滑「喀喀」響。
     *     微分筒每轉一圈套管就多露出（或蓋住）半毫米，轉動與前進的關係直接看得到。
     * 動作結束後量具停在讀數上；播放中再拖滑桿或把手，量爪會平順地追過去（不會穿過待測物而過衝）。
     * 讀數欄位一律顯示夾緊後的結果 value；暫停時沒有過渡，畫面直接停在讀數上。
     */
    let act = null;
    const follow = PL.motion.follower(value, { omega: 12, zeta: 1 });
    const ease = u => u * u * (3 - 2 * u);
    function actionPos(dt) {
      const vern = tool === "vernier", max = vern ? VERNIER_MAX : MICRO_MAX;
      const open = Math.max(0, Math.min(vern ? 8 : 1.5, max - value));
      const tOpen = 0.5, tHold = 0.25, tClose = vern ? 1.4 : 2.0, tClick = vern ? 0.6 : 0.8;
      act.t += dt;
      const t = act.t;
      act.phase = t < tOpen + tHold ? "open" : t < tOpen + tHold + tClose ? "close" : "clamp";
      if (t < tOpen) return value + open * ease(t / tOpen);
      if (t < tOpen + tHold) return value + open;
      if (t < tOpen + tHold + tClose) { const u = (t - tOpen - tHold) / tClose; return value + open * (1 - (1 - Math.pow(1 - u, 2.2))); }
      if (t > tOpen + tHold + tClose + tClick) act = null;
      return value;
    }
    function advance(dt, tick) {
      if (!clock.running) { act = null; shown = follow.update(value, 0, false); return; }
      // 迴圈剛啟動（按下播放）的第一格 dt = 0：開始一次量測動作
      if (tick && dt === 0 && !gripV.dragging && !gripM.dragging) act = { t: 0, phase: "open" };
      if (act && dt > 0) { shown = actionPos(dt); follow.value = shown; follow.vel = 0; follow.target = value; }
      else if (!act) shown = follow.update(value, dt, true);
    }
    const clock = PL.motion.clock(dt => draw(dt, true));

    /* 把手：游標卡尺抓活動爪、螺旋測微器抓棘輪旋柄，左右拖就是改讀數 */
    const gripV = PL.ui.handle(cv, { slider: sValue, label: "動くジョウ（左右に押す）",
      toValue: x => geo.mmPx ? geo.view0 + (x + 3 - geo.pad) / geo.mmPx : sValue.get(),
      onRelease: () => draw() });
    const gripM = PL.ui.handle(cv, { slider: sValue, label: "ラチェット（左右に引いてスピンドルを動かす）",
      toValue: x => geo.k ? (x - 88 - 12 - geo.xs0) / geo.k : sValue.get() });

    /* ---------------- 主繪圖 ---------------- */
    function draw(dt, tick) {
      const { ctx, W, H } = cv;
      cv.clear(); D.bg(cv);
      advance(dt > 0 ? dt : 0, tick);
      // 量具平放在實驗桌上（俯視）：鋼尺的金屬色在木桌上最像真的
      if (PL.apparatus && PL.apparatus.deskTop) PL.apparatus.deskTop(ctx, 0, 0, W, H);

      let readingText, digits;
      if (tool === "vernier") {
        const d = drawVernier(ctx, W, H);
        digits = divisions === 10 ? 1 : 2;
        readingText = d.snapped.toFixed(digits);
        rMain.set(d.M, 0);
        rK.set(d.k, 0);
        rFine.set(d.k * d.p, 3);
        dv.set(0, precision(), 2);
        dv.set(1, digits + " 桁");
        dv.set(2, "いいえ。目分量で読まない");
        dv.tone(2, "warn");
        magVernier(mag.canvas);
      } else {
        const m = drawMicrometer(ctx, W, H);
        digits = 3;
        readingText = m.snapped.toFixed(3);
        rMain.set(m.sleeve, 1);
        rK.set(PL.fmt(m.thimble, 1) + " 目盛り引く");
        rFine.set(m.thimble * 0.01, 3);
        dv.set(0, 0.01, 2);
        dv.set(1, "小数第 3 位");
        dv.set(2, "はい。最後の桁は必ず目分量");
        dv.tone(2, "bad");
        magMicrometer(mag.canvas);
      }

      // 練習模式把答案蓋住，否則等於直接給答案
      const hide = mode === "practice" && answered == null;
      rRead.set(hide ? "？？" : readingText);
      if (hide) { rMain.set("？"); rK.set("？"); rFine.set("？"); }

      if (mode === "practice") {
        if (answered == null) vd.set("読む練習中：まず自分で読んでから、答えを選ぶ", "info");
        else if (answered === correctIndex) vd.set("正解：" + readingText + " mm", "ok", 1);
        else vd.set("拡大窓をもう一度見る", "bad", 0.35);
        mag.setMode("練習モード · そろう目盛りに印をつけません");
      } else {
        vd.set("読み " + readingText + " mm（精度 " + PL.fmt(precision(), 2) + " mm）", "ok", 1);
        mag.setMode("説明モード · そろう目盛りに印をつけています");
      }

      if (act) {
        const msg = tool === "vernier"
          ? (act.phase === "open" ? "動くジョウを開いて、測るものを入れる…" : act.phase === "close" ? "ジョウを閉じる：拡大窓の中のそろう目盛りが動いていく" : "しっかりはさんだ。ここで読む")
          : (act.phase === "open" ? "まずスピンドルを引く…" : act.phase === "close" ? "ラチェットを回して進める：1 回転で 0.5 mm 進む" : "カチ、カチとラチェットが空回りした。力がちょうどよいので読む");
        D.text(ctx, msg, 16, 24, { color: PL.col("text"), size: 12, weight: "700" });
      } else if (!clock.running && clock.t === 0) {
        D.text(ctx, "再生を押して、測定の動きを一通り見る", 16, 24, { color: PL.col("text-dim"), size: 11 });
      }

      PL.ui.caption(cv, tool === "vernier"
        ? "副尺の " + divisions + " 目盛りは主尺の " + (divisions - 1) + " mm にちょうど等しいので、1 目盛りで " +
          PL.fmt(precision(), 2) + " mm ずれます。主尺とそろう目盛りは 1 つだけで、その番号が答えの小数部分です。"
        : "ねじの 1 回転で 0.5 mm、1 周 50 目盛りなので、1 目盛りは 0.01 mm です。まずスリーブの下の段の 0.5 mm の線が見えているか確かめます。" +
          "この段を見落とすと 0.5 mm 少なくなります。");
    }

    syncDivisionVisibility();
    renderProcedure();
    const origToolChange = draw;
    cv.onResize(() => draw());
    mag.canvas.onResize(() => draw());
    draw();

    // 切換量具時步驟卡要跟著換
    const obs = setInterval(() => {
      const want = tool;
      if (proc && proc.dataset.tool !== want) { proc.dataset.tool = want; renderProcedure(); }
    }, 400);

    return {
      stop() { clearInterval(obs); clock.stop(); cv.destroy(); mag.canvas.destroy(); },
      rerender: () => draw()
    };
  }});
})();

/* ------------------------------------------------------------------
   以下由 extended.js 移入（該檔在場景實物化之後超過單檔大小上限）
   ------------------------------------------------------------------ */
(function () {
  "use strict";
  const PL = window.PhysicsLab, D = PL.draw, TAU = PL.TAU;
  const AP = PL.apparatus;
  const color = () => PL.col("m-color", "#35e0cf");
  const ease = u => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };
  /*
   * 不確定度是抽象概念：滑桿一拉就「算出 N 筆」學生不會有量測感。
   * 改成任務式：一按一筆，自己決定要不要再量，看平均值與離散如何收斂。
   */
  PL.register("measurement-error", { build(root) {
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" }), cv = PL.canvas.create(L.canvasWrap, 0.7, 900);
    const trueLength = 100;                 // mm，模擬裡的真值（學生看不到直到揭曉）
    let readings = [];                      // 學生實際記錄的每一筆
    let revealed = false;

    PL.ui.section(L.controls, "課題：この金属の棒を測る");
    const sResolution = PL.ui.slider(L.controls, { label: "ものさしの目盛りの細かさ r", min: 0.1, max: 5, step: 0.1, value: 1, unit: "mm", digits: 1, onInput: () => { clearRecords(); } });
    const sBias = PL.ui.slider(L.controls, { label: "ゼロ点のずれ b（系統誤差）", min: -2, max: 2, step: 0.1, value: 0, unit: "mm", digits: 1, onInput: () => { clearRecords(); } });
    const sTarget = PL.ui.slider(L.controls, { label: "すすめる測定回数", min: 3, max: 20, step: 1, value: 5, unit: "回", digits: 0 });

    /* 情境預設：課本會點名的量測情境——理想尺、精密尺、未校零、粗解析度 */
    PL.ui.presets(L.controls, {
      label: "測定の場面",
      options: [
        { label: "理想的なものさし r=1mm", hint: "目盛りは中くらいで、ゼロ点は校正ずみ。比べる基準にする",
          apply: () => { sResolution.set(1); sBias.set(0); sTarget.set(5); clearRecords(); } },
        { label: "精密なものさし r=0.1mm", hint: "目盛りがとても細かい：読みはほとんどばらつかないが、系統誤差は残る",
          apply: () => { sResolution.set(0.1); sBias.set(0); sTarget.set(5); clearRecords(); } },
        { label: "ゼロ点未校正 +2mm", hint: "ゼロ点のずれ＝系統誤差：何回測っても平均値は本当の値からずれたまま",
          apply: () => { sResolution.set(1); sBias.set(2); sTarget.set(8); clearRecords(); } },
        { label: "目の粗いものさし r=5mm", hint: "目盛りが粗い：どの読みも 5 mm の目盛りの上にしかならない",
          apply: () => { sResolution.set(5); sBias.set(0); sTarget.set(8); clearRecords(); } }
      ]
    });

    const row = PL.ui.buttonRow(L.controls);
    const bOnce = PL.ui.button(row, "1 回測る", () => measureOnce(), { primary: true });
    const bFill = PL.ui.button(row, "すすめる回数まで一度に測る", () => {
      const target = Math.round(sTarget.get());
      while (readings.length < target) measureOnce(true);
      draw();
    });
    const bClear = PL.ui.button(row, "記録を消す", () => { clearRecords(); });
    PL.ui.note(L.controls,
      "「1 回測る」を 1 回押すごとに、実際にものさしを 1 回読んだことにします。" +
      "点はどんどん積み重なり、平均値はだんだん安定します。でも、ゼロ点のずれによる全体のずれは、何回測ってもなくなりません。");

    const rCount = PL.ui.readout(L.readouts, { label: "記録した回数", unit: "件" });
    const rMean = PL.ui.readout(L.readouts, { label: "平均値 x̄", unit: "mm" });
    const rSpread = PL.ui.readout(L.readouts, { label: "読みのばらつき s", unit: "mm" });
    const rUncertainty = PL.ui.readout(L.readouts, { label: "合成した不確かさ u", unit: "mm" });
    const rDifference = PL.ui.readout(L.readouts, { label: "平均値と本当の値の差", unit: "mm" });
    const rReport = PL.ui.readout(L.readouts, { label: "報告するときの書き方" });
    const rTask = PL.ui.readout(L.readouts, { label: "課題の進み具合" });

    function normal() {
      const u = Math.max(1e-8, Math.random()), v = Math.max(1e-8, Math.random());
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
    }
    function stats() {
      if (!readings.length) return { mean: NaN, spread: 0 };
      const mean = readings.reduce((sum, value) => sum + value, 0) / readings.length;
      const variance = readings.length > 1
        ? readings.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (readings.length - 1)
        : 0;
      return { mean, spread: Math.sqrt(variance) };
    }
    /*
     * 播放時，視線（讀到棒子末端的那條線）會在真實位置附近飄移：
     * 這是隨機誤差的來源——眼睛角度、棒端對不齊、手抖。飄移用 Ornstein–Uhlenbeck 過程，
     * 任一瞬間的偏差都服從同一個常態分布 N(0, (0.72 r)²)，和原本每次抽一個常態亂數的模型一致；
     * 按下「量測一次」就是把「這一瞬間」的視線位置記下來，再對齊到最近的刻度（解析度量化）。
     * 記下的那一筆會從尺上落進下方的散布圖，學生看得到「一筆資料是怎麼來的」。
     * 暫停時時間不走，量測沿用一次抽一個常態亂數、點直接出現。
     */
    const TAU_EYE = 0.35;
    let eye = normal() * sigma(), eyeR = sigma(), drops = [];
    function sigma() { return sResolution.get() * 0.72; }
    function stepEye(dt) {
      const sg = sigma();
      if (eyeR !== sg) { eye *= sg / Math.max(1e-9, eyeR); eyeR = sg; }   // 換了尺：飄移幅度跟著換
      let left = Math.min(dt, 0.1);
      while (left > 1e-6) { const h = Math.min(left, 1 / 60); eye += -eye / TAU_EYE * h + sg * Math.sqrt(2 * h / TAU_EYE) * normal(); left -= h; }
      drops.forEach(d => { d.age += dt; }); drops = drops.filter(d => d.age < 1.1);
    }
    function measureOnce(silent) {
      const resolution = sResolution.get(), bias = sBias.get();
      const live = clock && clock.running && !silent;
      // 均勻量化到尺的刻度：讀數只能是解析度的整數倍
      const raw = trueLength + bias + (live ? eye : normal() * sigma());
      const snapped = Math.round(raw / resolution) * resolution;
      readings.push(snapped);
      if (live) drops.push({ idx: readings.length - 1, raw, snapped, age: 0 });
      if (!silent) draw();
    }
    function clearRecords() {
      readings = [];
      revealed = false;
      drops = [];
      draw();
    }
    function taskState() {
      const target = Math.round(sTarget.get());
      const n = readings.length;
      if (n === 0) return "まだ測っていない：「1 回測る」を押して始める";
      if (n < target) return "" + n + " 回測った。報告する前に少なくとも " + target + " 回は測る";
      if (Math.abs(sBias.get()) > 0.05) return "回数は足りているが、ゼロ点が校正されていないので、平均値が全体にずれる";
      return "回数は十分：x̄ ± u と書いて提出できる";
    }

    let rodDrag = null;
    // 把手抓待測棒：左右推動它，棒的起點就不再對準尺的零點——這就是「零點偏移」
    const grip = PL.ui.handle(cv, { slider: sBias, label: "測る金属の棒（左右に押してゼロ点のずれを変える）",
      toValue: x => { if (!rodDrag) rodDrag = { x, b: sBias.get() }; return rodDrag.b + (x - rodDrag.x) / 8; },
      onRelease: () => { rodDrag = null; } });
    const clock = PL.motion.clock(dt => { stepEye(dt); draw(); });
    const EYE_C = () => PL.theme.isLight() ? "#d0453a" : "#ff7a6b";

    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const resolution = sResolution.get(), bias = sBias.get(), result = stats();
      const target = Math.round(sTarget.get());
      rCount.set(readings.length, 0);
      rTask.set(taskState());

      const AP = PL.apparatus;
      /* 鋼尺（實物）：銀色尺身＋刻線＋數字；tickAt(i) 回傳第 i 條刻線的 x */
      const steelRuler = (xa, xb, y, h) => {
        const g = ctx.createLinearGradient(0, y, 0, y + h);
        g.addColorStop(0, "rgb(236,239,243)"); g.addColorStop(0.55, "rgb(204,209,216)"); g.addColorStop(1, "rgb(160,166,176)");
        ctx.fillStyle = g; ctx.fillRect(xa, y, xb - xa, h);
        ctx.strokeStyle = "rgba(40,46,56,0.55)"; ctx.lineWidth = 1; ctx.strokeRect(xa + 0.5, y + 0.5, xb - xa - 1, h - 1);
        PL.theme.note(ctx, "rgb(214,218,224)", xa, y, xb - xa, h);
      };
      const steelRod = (xa, xb, y, h) => {
        const g = ctx.createLinearGradient(0, y, 0, y + h);
        g.addColorStop(0, "rgb(150,156,166)"); g.addColorStop(0.35, "rgb(236,240,245)"); g.addColorStop(1, "rgb(96,102,112)");
        ctx.fillStyle = g; AP.rrPath(ctx, xa, y, xb - xa, h, h / 2); ctx.fill();
        ctx.strokeStyle = "rgba(40,46,56,0.5)"; ctx.lineWidth = 1; ctx.stroke();
      };
      if (!readings.length) {
        AP.labRoom(ctx, W, H, H * 0.74, {});
        D.text(ctx, "同じ金属の棒：ものさしで長さを読む", W / 2, H * 0.34, { color: PL.col("text"), size: 16, align: "center", weight: "700" });
        D.text(ctx, "「1 回測る」を押すたびに、実際に目盛りを 1 回読んだことにする", W / 2, H * 0.34 + 26,
          { color: PL.col("text-faint"), size: 12, align: "center" });
        D.text(ctx, "いまの設定：目盛りの細かさ " + PL.fmt(resolution, 1) + " mm · ゼロ点のずれ " + PL.fmt(bias, 1) +
          " mm · すすめる回数 " + target + " 回以上", W / 2, H * 0.34 + 48,
          { color: PL.col("text-dim"), size: 11, align: "center" });
        // 靜態示意：尺（刻度密疏跟解析度）與棒（位置跟零點偏移）
        const x0 = 80, x1 = W - 80, y = H * 0.74 - 34;
        steelRuler(x0, x1, y, 34);
        // 解析度越粗，刻度越疏
        const ticks = PL.clamp(Math.round(40 * (1 / Math.max(0.1, resolution))), 8, 40);
        ctx.strokeStyle = "rgba(30,34,40,0.85)"; ctx.lineWidth = 1;
        for (let i = 0; i <= ticks; i++) {
          const x = Math.round(x0 + (x1 - x0) * i / ticks) + 0.5, major = i % 5 === 0;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + (major ? 16 : 9)); ctx.stroke();
        }
        // 棒子擺在尺上，整支隨零點偏移左右微移（放大 8 倍才看得出來）
        const shift = bias * 8;
        steelRod(x0 + (x1 - x0) * 0.2 + shift, x0 + (x1 - x0) * 0.8 + shift, y - 16, 18);
        D.text(ctx, "測る金属の棒", x0 + (x1 - x0) * 0.5 + shift, y - 22, { color: PL.col("text"), size: 10, align: "center", weight: "700" });
        grip.place(x0 + (x1 - x0) * 0.35 + shift, y - 7);
        if (clock.running) {
          // 視線：在棒子末端附近飄（同樣放大 8 倍）
          const ex = x0 + (x1 - x0) * 0.8 + shift + eye * 8;
          D.line(ctx, ex, y - 20, ex, y + 38, EYE_C(), 1.6, [3, 2]);
          D.text(ctx, "あなたの視線", ex, y + 50, { color: EYE_C(), size: 9.5, align: "center", weight: "700" });
        }
        // 建議次數進度格
        const gx = x0, gy = y + 66, cell = Math.min(22, (x1 - x0) / Math.max(8, target));
        D.text(ctx, "すすめる測定の進み具合", gx, gy - 6, { color: PL.col("text-faint"), size: 9 });
        for (let i = 0; i < target; i++) {
          D.rect(ctx, gx + i * (cell + 3), gy, cell, 8, { fill: PL.theme.pale(0.10), r: 2 });
        }
        rMean.set("—"); rSpread.set("—"); rUncertainty.set("—"); rDifference.set("—"); rReport.set("測ると表示される");
        return;
      }

      const standardError = result.spread / Math.sqrt(readings.length);
      const instrumentUncertainty = resolution / Math.sqrt(12);
      const uncertainty = Math.sqrt(standardError * standardError + instrumentUncertainty * instrumentUncertainty);
      const halfRange = Math.max(4, ...readings.map(value => Math.abs(value - trueLength) + resolution * 1.5));
      const min = trueLength - halfRange, max = trueLength + halfRange;
      const x0 = 60, x1 = W - 42, mapX = value => x0 + (value - min) / (max - min) * (x1 - x0);

      AP.labStrip(ctx, W, 92, 86, {});
      D.text(ctx, "課題：この金属の棒を測る（記録 " + readings.length + " 回）", x0, 25, { color: PL.col("text"), size: 12, weight: "700" });
      D.text(ctx, revealed ? "本当の値 " + trueLength + " mm（比べるためだけ）" : "本当の値はまだ秘密", x1, 25, { color: PL.col("text-faint"), size: 9, align: "right" });

      // 尺與棒
      steelRuler(x0, x1, 52, 34);
      ctx.strokeStyle = "rgba(30,34,40,0.85)"; ctx.lineWidth = 1;
      for (let value = Math.ceil(min); value <= Math.floor(max); value++) {
        const x = Math.round(mapX(value)) + 0.5, major = value % 2 === 0;
        ctx.beginPath(); ctx.moveTo(x, 52); ctx.lineTo(x, 52 + (major ? 16 : 9)); ctx.stroke();
        if (major) D.text(ctx, String(value), x, 82, { color: PL.col("text-dim"), size: 8.5, align: "center" });
      }
      // 棒子由左邊伸進來（放大檢視棒子末端附近）。零點沒對準時整支棒相對尺錯開 b，
      // 所以末端落在尺上 L + b 的位置——讀值整群偏移的原因就在這裡看得到
      const rodEnd = mapX(trueLength + bias);
      steelRod(x0 - 12, rodEnd, 36, 16);
      D.text(ctx, "棒の端（拡大）", Math.max(x0 + 60, rodEnd - 70), 32, { color: PL.col("text"), size: 9.5, align: "center", weight: "700" });
      grip.place(x0 + 140, 46);
      if (clock.running) {
        const ex = mapX(trueLength + bias + eye);
        D.line(ctx, ex, 30, ex, 92, EYE_C(), 1.6, [3, 2]);
        D.text(ctx, "視線", ex + 4, 100, { color: EYE_C(), size: 9, weight: "700" });
      }

      // 散布：每一筆是一顆綠點，按記錄順序排開
      const scatterTop = H * 0.28, scatterBottom = H * 0.51;
      D.rect(ctx, x0, scatterTop, x1 - x0, scatterBottom - scatterTop, { fill: "rgba(7,11,17,0.35)", stroke: "rgba(255,255,255,0.15)", r: 5 });
      D.text(ctx, "毎回の読み（自分で押したもの）", x0 + 10, scatterTop + 17, { color: PL.col("text-faint"), size: 9 });
      if (revealed) D.line(ctx, mapX(trueLength), scatterTop + 25, mapX(trueLength), scatterBottom - 12, PL.col("warn"), 1.8, [4, 4]);
      D.line(ctx, mapX(result.mean), scatterTop + 25, mapX(result.mean), scatterBottom - 12, PL.col("accent-2"), 2);
      const rowY = index => scatterTop + 48 + (index % 4) * ((scatterBottom - scatterTop - 68) / 3);
      const flying = new Set(drops.filter(d => d.age < 0.9).map(d => d.idx));
      readings.forEach((value, index) => {
        if (flying.has(index)) return;
        const y = rowY(index);
        D.disc(ctx, mapX(value), y, 5, { fill: color(), glow: color(), glowSize: 7 });
        D.text(ctx, String(index + 1), mapX(value), y - 9, { color: PL.col("text-faint"), size: 8, align: "center" });
      });
      /*
       * 剛記下的那一筆：先在尺上停在當下的視線位置（還沒量化），
       * 再吸到最近的一條刻度（讀數只能是解析度的整數倍），最後落進散布圖。
       */
      drops.forEach(d => {
        if (d.age >= 0.9) return;
        const a = d.age, xr0 = mapX(d.raw), xs = mapX(d.snapped);
        const x = a < 0.25 ? xr0 : a < 0.45 ? xr0 + (xs - xr0) * ease((a - 0.25) / 0.2) : xs;
        if (a < 0.45) {
          D.line(ctx, x, 30, x, 92, color(), 2.2);
          D.text(ctx, a < 0.25 ? "この瞬間を記録" : "目盛りに合わせる", x + 5, 104, { color: color(), size: 9.5, weight: "700" });
        } else {
          const u = ease((a - 0.45) / 0.45), y = 70 + (rowY(d.idx) - 70) * u;
          D.line(ctx, xs, 52, xs, 86, color(), 2.2);
          D.disc(ctx, xs, y, 5, { fill: color(), glow: color(), glowSize: 9 });
        }
      });
      D.text(ctx, "平均値", mapX(result.mean), scatterTop + 19, { color: PL.col("accent-2"), size: 9, align: "center" });
      if (revealed) D.text(ctx, "本当の値", mapX(trueLength), scatterBottom - 2, { color: PL.col("warn"), size: 9, align: "center" });

      // 直方圖
      const histTop = H * 0.64, histBottom = H - 42, binCount = 10, binWidth = (max - min) / binCount;
      const bins = Array.from({ length: binCount }, () => 0);
      readings.forEach(value => { const bin = PL.clamp(Math.floor((value - min) / binWidth), 0, binCount - 1); bins[bin] += 1; });
      const maxBin = Math.max(1, ...bins), barWidth = (x1 - x0) / binCount;
      D.text(ctx, "読みの分布：回数が多いほど平均値は安定する", x0, histTop - 14, { color: PL.col("text"), size: 11, weight: "700" });
      D.line(ctx, x0, histBottom, x1, histBottom, "rgba(255,255,255,0.42)", 1);
      bins.forEach((count, index) => {
        const height = (histBottom - histTop) * count / maxBin;
        D.rect(ctx, x0 + index * barWidth + 3, histBottom - height, Math.max(3, barWidth - 6), height, { fill: "rgba(53,224,207,0.52)", stroke: color(), r: 2 });
      });
      if (revealed) D.line(ctx, mapX(trueLength), histTop, mapX(trueLength), histBottom, PL.col("warn"), 1.5, [4, 4]);
      D.line(ctx, mapX(result.mean), histTop, mapX(result.mean), histBottom, PL.col("accent-2"), 2);
      const biasText = Math.abs(bias) < 0.05
        ? "ゼロ点は校正ずみ：何回も測ることで偶然誤差を小さくしている"
        : "ゼロ点のずれ " + PL.fmt(bias, 1) + " mm：系統誤差なので、何回測ってもなくならない";
      D.text(ctx, biasText, W / 2, H - 16, { color: Math.abs(bias) < 0.05 ? PL.col("text-faint") : PL.col("danger"), size: 9.5, align: "center" });

      rMean.set(result.mean, 2);
      rSpread.set(result.spread, 2);
      rUncertainty.set(uncertainty, 2);
      rDifference.set(result.mean - trueLength, 2);
      rReport.set(PL.fmt(result.mean, 1) + " ± " + PL.fmt(uncertainty, 1) + " mm");
    }

    PL.ui.button(row, "本当の値を見る", () => {
      if (!readings.length) return;
      revealed = true;
      draw();
    });

    cv.onResize(() => draw()); draw();
    return { stop() { clock.stop(); cv.destroy(); }, rerender: () => draw() };
  }});


})();
