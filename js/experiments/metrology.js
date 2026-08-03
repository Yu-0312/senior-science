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
  const PL = window.PhysicsLab, D = PL.draw;
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
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.42, 900);

    let tool = "vernier";        // vernier | micrometer
    let divisions = 50;          // 游標分度：10 / 20 / 50
    let mode = "learn";          // learn 認識量具 | practice 讀數練習
    let value = 81.32;           // 目前的真實長度（mm）
    let seed = 20260802;
    let answered = null;         // 練習模式：學生按下的選項

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
    function decompose() {
      const p = precision();
      const snapped = Math.round(value / p) * p;
      const M = Math.floor(snapped + 1e-9);
      const k = Math.round((snapped - M) / p);
      return { snapped, M, k, p };
    }

    /* 螺旋測微器：套管讀數以 0.5 mm 為階，微分筒 50 格對應 0.5 mm */
    function microParts() {
      const snapped = Math.round(value * 1000) / 1000;
      const halves = Math.floor(snapped / 0.5 + 1e-9);       // 露出的半毫米格數
      const sleeve = halves * 0.5;
      const thimble = (snapped - sleeve) / 0.01;             // 0..49.9…（含估讀）
      return { snapped, sleeve, thimble, halfShown: halves % 2 === 1 };
    }

    /* ---------------- 控制項 ---------------- */
    PL.ui.section(L.controls, "量具");
    const toolChips = PL.ui.chipGroup(L.controls, {
      value: "vernier",
      options: [
        { value: "vernier", label: "游標卡尺" },
        { value: "micrometer", label: "螺旋測微器" }
      ],
      onChange: v => {
        tool = v;
        value = tool === "vernier" ? 81.32 : 6.721;
        answered = null;
        syncDivisionVisibility();
        sValue.setRange(0, tool === "vernier" ? VERNIER_MAX : MICRO_MAX);
        sValue.set(value);
        draw();
      }
    });

    const divWrap = PL.el("div", "", L.controls);
    PL.ui.section(divWrap, "游標分度（決定能讀到第幾位）");
    const divChips = PL.ui.chipGroup(divWrap, {
      value: "50",
      options: [
        { value: "10", label: "10 分度" },
        { value: "20", label: "20 分度" },
        { value: "50", label: "50 分度" }
      ],
      onChange: v => { divisions = Number(v); value = Math.round(value / precision()) * precision(); sValue.set(value); answered = null; draw(); }
    });
    function syncDivisionVisibility() { divWrap.style.display = tool === "vernier" ? "" : "none"; }

    PL.ui.section(L.controls, "模式");
    PL.ui.chipGroup(L.controls, {
      value: "learn",
      options: [
        { value: "learn", label: "認識量具" },
        { value: "practice", label: "讀數練習" }
      ],
      onChange: v => { mode = v; answered = null; if (v === "practice") newQuestion(); draw(); }
    });

    const sValue = PL.ui.slider(L.controls, {
      label: "拖動改變讀數", min: 0, max: VERNIER_MAX, step: 0.001, value: 81.32,
      unit: "mm", digits: 2,
      onInput: v => { value = v; answered = null; draw(); }
    });

    /* 情境預設：這些是課本會特別提醒、學生也最常錯的位置 */
    PL.ui.presets(L.controls, {
      label: "常考位置",
      options: [
        { label: "剛好整毫米", hint: "共線格 k = 0，末位要寫 0，不能省",
          apply: () => { value = tool === "vernier" ? 42 : 7.000; sValue.set(value); answered = null; draw(); } },
        { label: "半毫米剛露出", hint: "測微器最常見的陷阱：套管下排的半毫米線露出來了沒",
          apply: () => { tool === "micrometer" ? (value = 6.512) : (value = 42.5); sValue.set(value); answered = null; draw(); } },
        { label: "共線在中間", hint: "游標中段共線，最容易數錯格號",
          apply: () => { const p = precision(); value = 33 + Math.round((tool === "vernier" ? 24 : 25)) * p; sValue.set(value); answered = null; draw(); } },
        { label: "隨機出一題", hint: "換一個位置自己讀讀看",
          apply: () => { newQuestion(); draw(); } }
      ]
    });

    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "重設", () => {
      tool = "vernier"; divisions = 50; value = 81.32; answered = null;
      toolChips.set && toolChips.set("vernier"); divChips.set && divChips.set("50");
      syncDivisionVisibility(); sValue.setRange(0, VERNIER_MAX); sValue.set(value); draw();
    }, { primary: true });

    PL.ui.note(L.controls,
      "游標卡尺的原理是「n 格游標剛好等於主尺的 n−1 mm」，所以游標每一格都比主尺短 1/n mm。" +
      "把兩把尺並排，只有一格會剛好對齊，那一格的格號乘上 1/n 就是不足一毫米的部分。" +
      "分度換成 10 或 20 再看同一個位置：精度是量具給的，不是算出來的。");

    /* ---------------- 讀數輸出 ---------------- */
    const vd = PL.ui.verdict(L.readouts.parentNode || L.readouts, { label: "—" });

    const rMain = PL.ui.readout(L.readouts, { label: "主尺 M", unit: "mm" });
    const rK = PL.ui.readout(L.readouts, { label: "對齊格 k" });
    const rFine = PL.ui.readout(L.readouts, { label: "k × 精度", unit: "mm" });
    const rRead = PL.ui.readout(L.readouts, { label: "讀數", unit: "mm" });

    const dv = PL.ui.derived(L.canvasWrap.parentNode, [
      { label: "量具精度（分度值）", unit: "mm", hint: "由量具本身決定" },
      { label: "應寫幾位小數", hint: "多寫或少寫都算錯" },
      { label: "這一位是估的嗎", hint: "游標不估讀／測微器必估讀" }
    ]);

    /* 放大窗：整尺看不出 0.02 mm 的錯位 */
    const mag = PL.ui.magnifier(L.canvasWrap.parentNode, {
      title: "讀數放大窗",
      mode: "講解模式 · 已標出對齊",
      note: "整尺看不出 0.02 mm 的錯位（不足半個像素）——真卡尺也得湊近瞇眼，讀數靠這扇窗。",
      aspect: 0.30
    });

    /* 步驟教學：兩把量具的流程不同，切換時整段換掉 */
    let proc = null;
    function renderProcedure() {
      if (proc && proc.remove) proc.remove();
      const host = L.controls;
      proc = tool === "vernier"
        ? PL.ui.procedure(host, {
            title: "讀數三步（游標卡尺）",
            steps: [
              "<strong>讀主尺</strong>：取游標 0 線<strong>左側</strong>最近的那條刻線，得整毫米數 M。",
              "<strong>找共線</strong>：在游標上找出與主尺刻線<strong>正好對齊</strong>的那一格，記下格號 k。",
              "<strong>相加</strong>：L = M + k × " + PL.fmt(precision(), 2) + " mm，寫到 " +
                (divisions === 10 ? "1" : "2") + " 位小數為止。"
            ],
            rule: "游標卡尺<strong>不估讀</strong> —— 讀到分度值為止，多寫一位反而錯" +
              "（12.34 不能寫成 12.340）。"
          })
        : PL.ui.procedure(host, {
            title: "讀數三步（螺旋測微器）",
            steps: [
              "<strong>讀套管</strong>：數出露出的整毫米，再專門看一眼下排——<strong>半毫米線露出來沒有</strong>。",
              "<strong>讀微分筒</strong>：看基準線卡在第幾格，格數 N 乘 0.01 mm。",
              "<strong>相加並估讀一位</strong>：結果寫滿 3 位小數，末位是估的。"
            ],
            rule: "螺旋測微器<strong>必須估讀</strong> —— 少寫一位同樣錯（2.35 要寫成 2.350）。"
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
      t.textContent = "這個位置的讀數是多少？";
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
          ? "正確。注意末位：" + (tool === "vernier"
              ? "游標卡尺寫到分度值就停，不可以再多一位。"
              : "測微器一定要估讀到千分位，末位是 0 也要寫。")
          : feedbackFor(choices[answered]);
      }
    }
    function feedbackFor(picked) {
      const digits = tool === "vernier" ? (divisions === 10 ? 1 : 2) : 3;
      const truth = tool === "vernier" ? decompose().snapped : microParts().snapped;
      const dec = (picked.split(".")[1] || "").length;
      if (dec !== digits) {
        return dec > digits
          ? "位數多了。" + (tool === "vernier"
              ? "游標卡尺不估讀，讀到分度值 " + PL.fmt(precision(), 2) + " mm 為止。"
              : "測微器估讀一位就好，不是兩位。")
          : "位數少了。" + (tool === "vernier"
              ? "分度值是 " + PL.fmt(precision(), 2) + " mm，小數要寫滿。"
              : "測微器必須估讀一位，末位是 0 也要寫出來。");
      }
      const diff = Number(picked) - truth;
      if (tool === "micrometer" && Math.abs(diff + 0.5) < 1e-6) {
        return "少了 0.5 mm——套管下排的半毫米線已經露出來了，這一格最容易漏看。";
      }
      if (Math.abs(Math.abs(diff) - precision()) < 1e-9) {
        return "差了剛好一格。共線的格號數錯了，回放大窗再數一次。";
      }
      return "再看一次放大窗裡標成綠色的那一格。";
    }

    /* ---------------- 繪圖：游標卡尺 ---------------- */
    function drawVernier(ctx, W, H) {
      const d = decompose();
      const pad = 40;
      const mmPx = (W - pad * 2) / 96;                 // 畫面顯示約 96 mm 的區段
      const view0 = Math.max(0, Math.min(VERNIER_MAX - 96, d.M - 74));
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

      // 測量物：夾在兩爪之間，長度就是讀數
      D.rect(ctx, X(view0 + 2) + 2, barY + 46, Math.max(2, vx - 12 - (X(view0 + 2) + 2)), 26,
        { fill: "rgba(120,140,165,0.35)", stroke: PL.theme.pale(0.3), r: 2 });

      return d;
    }

    /* 游標卡尺的放大窗：只放大共線格附近的幾格 */
    function magVernier(c) {
      const { ctx, W, H } = c;
      c.clear(); D.bg(c);
      const d = decompose();
      const span = divisions === 10 ? 6 : divisions === 20 ? 8 : 10;   // 放大顯示幾格游標
      const k0 = Math.max(0, Math.min(divisions - span, d.k - Math.floor(span / 2)));
      const vLenMm = divisions === 10 ? 9 : divisions === 20 ? 19 : 49;
      const perMm = (W - 60) / (span * vLenMm / divisions);
      const X = mm => 30 + (mm - (d.snapped + k0 * vLenMm / divisions)) * perMm;

      const topY = H * 0.14, botY = H * 0.56;
      D.rect(ctx, 22, topY - 6, W - 44, 30, { fill: PL.theme.shade(0.3), stroke: PL.theme.pale(0.26), width: 1, r: 4 });
      D.rect(ctx, 22, botY - 6, W - 44, 32, { fill: PL.theme.shade(0.18), stroke: PL.theme.pale(0.26), width: 1, r: 4 });
      D.text(ctx, "主尺", 28, topY + 8, { color: PL.col("text-faint"), size: 9 });
      D.text(ctx, "游標", 28, botY + 8, { color: PL.col("text-faint"), size: 9 });

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
          D.text(ctx, "共線 k = " + d.k, x + 6, (topY + botY) / 2 + 4,
            { color: PL.col("ok"), size: 10, weight: "700" });
        }
      }
    }

    /* ---------------- 繪圖：螺旋測微器 ---------------- */
    function drawMicrometer(ctx, W, H) {
      const m = microParts();
      const cx = W * 0.5, cy = H * 0.52;
      // U 形框架
      ctx.save();
      ctx.strokeStyle = METAL.frame(); ctx.lineWidth = 20; ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(cx - 170, cy - 46);
      ctx.arc(cx - 150, cy + 26, 74, Math.PI * 1.15, Math.PI * 0.6, false);
      ctx.stroke();
      ctx.restore();
      // 砧座與測微螺桿
      D.rect(ctx, cx - 120, cy - 12, 24, 26, { fill: METAL.anvil(), r: 2 });
      D.rect(ctx, cx - 60, cy - 11, 130, 24, { fill: METAL.anvil(), stroke: PL.theme.pale(0.3), r: 3 });
      // 待測物：厚度就是讀數
      const thick = Math.max(3, m.snapped * 3.4);
      D.rect(ctx, cx - 96, cy - 26 - thick * 0.2, thick, 52 + thick * 0.4,
        { fill: "#c9a227", stroke: PL.theme.pale(0.3), r: 2 });
      // 固定套管的刻度：上排整毫米、下排半毫米
      for (let i = 0; i <= 10; i += 1) {
        const x = cx - 54 + i * 11;
        D.line(ctx, x, cy - 11, x, cy - 3, METAL.tick(), 1.2);
        if (i % 5 === 0) D.text(ctx, String(i), x, cy - 15, { color: METAL.label(), size: 8.5, align: "center" });
        // 下排的半毫米線：錯開半格，這排就是最常被漏看的那一排
        D.line(ctx, x + 5.5, cy + 3, x + 5.5, cy + 11, METAL.tick(), 1.2);
      }
      // 微分筒
      const drum = cx + 70;
      D.rect(ctx, drum, cy - 30, 92, 60, { fill: METAL.drum(), stroke: PL.theme.pale(0.35), r: 5 });
      for (let i = 0; i < 12; i += 1) {
        const frac = ((m.thimble / 50) + i / 12) % 1;
        const y = cy - 26 + frac * 52;
        D.line(ctx, drum + 4, y, drum + 30, y, METAL.tick(), 1);
      }
      D.line(ctx, drum - 6, cy, drum + 92, cy, PL.col("danger"), 1.4);   // 基準線
      D.text(ctx, "0 – 25 mm · 0.01", cx - 118, cy + 74, { color: METAL.label(), size: 10 });
      return m;
    }

    function magMicrometer(c) {
      const { ctx, W, H } = c;
      c.clear(); D.bg(c);
      const m = microParts();
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
      D.text(ctx, "上排：整毫米", 34, baseY - 46, { color: PL.col("text-faint"), size: 9 });
      D.text(ctx, "下排：半毫米（露出才算 +0.5）", 34, baseY + 46, { color: PL.col("text-faint"), size: 9 });
      // 目前套管讀數的位置
      const xs = X(m.sleeve);
      if (xs > 32 && xs < W - 32) {
        D.line(ctx, xs, baseY - 44, xs, baseY + 32, PL.col("ok"), 1.6, [4, 3]);
        D.text(ctx, "套管 " + PL.fmt(m.sleeve, 1) + " mm", xs + 6, baseY - 48,
          { color: PL.col("ok"), size: 10, weight: "700" });
      }
      // 微分筒格數
      D.text(ctx, "微分筒 " + PL.fmt(m.thimble, 1) + " 格 × 0.01 = " + PL.fmt(m.thimble * 0.01, 3) + " mm",
        W - 34, baseY + 46, { color: PL.col("text-dim"), size: 10, align: "right" });
    }

    /* ---------------- 主繪圖 ---------------- */
    function draw() {
      const { ctx, W, H } = cv;
      cv.clear(); D.bg(cv);

      let readingText, digits;
      if (tool === "vernier") {
        const d = drawVernier(ctx, W, H);
        digits = divisions === 10 ? 1 : 2;
        readingText = d.snapped.toFixed(digits);
        rMain.set(d.M, 0);
        rK.set(d.k, 0);
        rFine.set(d.k * d.p, 3);
        dv.set(0, precision(), 2);
        dv.set(1, digits + " 位小數");
        dv.set(2, "否，不估讀");
        dv.tone(2, "warn");
        magVernier(mag.canvas);
      } else {
        const m = drawMicrometer(ctx, W, H);
        digits = 3;
        readingText = m.snapped.toFixed(3);
        rMain.set(m.sleeve, 1);
        rK.set(PL.fmt(m.thimble, 1) + " 格");
        rFine.set(m.thimble * 0.01, 3);
        dv.set(0, 0.01, 2);
        dv.set(1, "3 位小數");
        dv.set(2, "是，末位必估");
        dv.tone(2, "bad");
        magMicrometer(mag.canvas);
      }

      // 練習模式把答案蓋住，否則等於直接給答案
      const hide = mode === "practice" && answered == null;
      rRead.set(hide ? "？？" : readingText);
      if (hide) { rMain.set("？"); rK.set("？"); rFine.set("？"); }

      if (mode === "practice") {
        if (answered == null) vd.set("讀數練習中：先自己讀，再點選答案", "info");
        else if (answered === correctIndex) vd.set("答對了：" + readingText + " mm", "ok", 1);
        else vd.set("再看一次放大窗", "bad", 0.35);
        mag.setMode("練習模式 · 不標出對齊");
      } else {
        vd.set("讀數 " + readingText + " mm（精度 " + PL.fmt(precision(), 2) + " mm）", "ok", 1);
        mag.setMode("講解模式 · 已標出對齊");
      }

      PL.ui.caption(cv, tool === "vernier"
        ? "游標的 " + divisions + " 格恰好等於主尺的 " + (divisions - 1) + " mm，所以每格差 " +
          PL.fmt(precision(), 2) + " mm；只有一格會與主尺共線，那一格的格號就是答案的小數部分。"
        : "螺距 0.5 mm、圓周 50 格，所以一格 0.01 mm。先確認套管下排的半毫米線露出來沒有——" +
          "漏看這一排就會整整少 0.5 mm。");
    }

    syncDivisionVisibility();
    renderProcedure();
    const origToolChange = draw;
    cv.onResize(draw);
    mag.canvas.onResize(draw);
    draw();

    // 切換量具時步驟卡要跟著換
    const obs = setInterval(() => {
      const want = tool;
      if (proc && proc.dataset.tool !== want) { proc.dataset.tool = want; renderProcedure(); }
    }, 400);

    return {
      stop() { clearInterval(obs); cv.destroy(); mag.canvas.destroy(); },
      rerender: draw
    };
  }});
})();
