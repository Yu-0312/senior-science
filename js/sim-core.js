/*
 * sim-core.js — 模擬引擎
 * 提供：實驗註冊、響應式高解析 canvas、滑桿／按鈕／下拉／讀數等控制項、
 * 動畫迴圈、向量與圖形繪製助手、以及可重複使用的 Graph 座標系。
 * 所有互動實驗都以 PhysicsLab.register(id, { build(root) }) 註冊。
 */
(function () {
  "use strict";

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  /* -------------------------------------------------------------------------
     主題色讀取
     getComputedStyle 會強制樣式重算，而 col() 在每個影格會被呼叫數十次。
     以「主題 + 模組色」為鍵做快取，切換時自動失效。
     ------------------------------------------------------------------------- */
  const themeCache = { key: "", values: new Map() };

  function themeName() {
    return document.documentElement.getAttribute("data-theme") || "dark";
  }

  function cacheKey() {
    // 讀 inline style 不會觸發重算，比 getComputedStyle 便宜得多。
    return themeName() + "|" + document.documentElement.style.getPropertyValue("--m-color");
  }

  // 讀取目前主題色（隨深／淺色切換即時更新）
  function col(name, fallback) {
    const key = cacheKey();
    if (themeCache.key !== key) { themeCache.key = key; themeCache.values.clear(); }
    let v = themeCache.values.get(name);
    if (v === undefined) {
      v = getComputedStyle(document.documentElement).getPropertyValue("--" + name).trim();
      themeCache.values.set(name, v);
    }
    return v || fallback || "#34d3c4";
  }

  /* -------------------------------------------------------------------------
     主題感知墨色（Adaptive ink）

     84 個實驗檔裡有大量寫死的白色系顏色（#fff、#e6edf3、rgba(255,255,255,α)…），
     在深色實驗台上很清楚，切到淺色主題就整片消失。逐一改寫 250 多處既易漏又難維護，
     因此改在繪圖層做「依背景自動選墨色」：

       1. D.bg() 會重置一張粗網格（每格 12px），記錄該處背景的相對亮度。
       2. D.disc / D.rect / D.ring 等有填色的圖形，會把覆蓋到的格子更新成填色亮度。
       3. 畫線與文字時，若要求的顏色屬於「淺色系」而底下的格子也是淺的，
          就換成等透明度的深色墨水；若底下是彩色圓點或深色方塊，白字原樣保留。

     全部用算術完成，不做 getImageData 回讀，因此不影響 45fps 的模擬效能。
     ------------------------------------------------------------------------- */
  const INK_CELL = 12;                 // 粗網格邊長（邏輯 px）
  const LIGHT_INK = [22, 32, 46];      // 淺色主題的深墨水 #16202e
  const DARK_INK = [238, 243, 250];    // 深色主題的亮墨水 #eef3fa
  const colorCache = new Map();

  // 把 #rgb / #rrggbb / rgb() / rgba() 解析成 [r, g, b, a]；認不得就回傳 null。
  function parseColor(input) {
    if (typeof input !== "string") return null;
    const raw = input.trim();
    if (!raw) return null;
    if (colorCache.has(raw)) return colorCache.get(raw);
    let out = null;
    if (raw[0] === "#") {
      const hex = raw.slice(1);
      if (hex.length === 3 || hex.length === 4) {
        out = [parseInt(hex[0] + hex[0], 16), parseInt(hex[1] + hex[1], 16), parseInt(hex[2] + hex[2], 16),
          hex.length === 4 ? parseInt(hex[3] + hex[3], 16) / 255 : 1];
      } else if (hex.length === 6 || hex.length === 8) {
        out = [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16),
          hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1];
      }
    } else if (/^rgba?\(/i.test(raw)) {
      const parts = raw.slice(raw.indexOf("(") + 1, raw.lastIndexOf(")")).split(/[,/\s]+/).filter(Boolean);
      if (parts.length >= 3) {
        const channel = s => s.indexOf("%") >= 0 ? Math.round(parseFloat(s) * 2.55) : parseFloat(s);
        out = [channel(parts[0]), channel(parts[1]), channel(parts[2]),
          parts.length > 3 ? (parts[3].indexOf("%") >= 0 ? parseFloat(parts[3]) / 100 : parseFloat(parts[3])) : 1];
      }
    }
    if (out && out.some(v => !isFinite(v))) out = null;
    if (colorCache.size < 512) colorCache.set(raw, out);
    return out;
  }

  // 相對亮度（sRGB luminance，0 = 純黑、1 = 純白）
  function luminance(rgb) {
    const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
  }

  // 飽和度低＋亮度高的顏色，才算「為了深色背景而寫死的白色系」。
  function isPaleNeutral(rgb) {
    const max = Math.max(rgb[0], rgb[1], rgb[2]), min = Math.min(rgb[0], rgb[1], rgb[2]);
    if (max === 0) return false;
    const chroma = (max - min) / 255;
    return chroma <= 0.16 && luminance(rgb) >= 0.42;
  }

  function rgba(rgb, alpha) {
    return "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + (alpha == null ? 1 : Math.min(1, alpha)) + ")";
  }

  // 每個 canvas context 掛一張亮度網格
  function inkMap(ctx) {
    let map = ctx._labInkMap;
    if (!map) { map = ctx._labInkMap = { cols: 0, rows: 0, cells: null, base: 0.04 }; }
    return map;
  }

  function resetInkMap(ctx, W, H, baseLum) {
    const map = inkMap(ctx);
    const cols = Math.max(1, Math.ceil(W / INK_CELL)), rows = Math.max(1, Math.ceil(H / INK_CELL));
    if (map.cols !== cols || map.rows !== rows || !map.cells) {
      map.cols = cols; map.rows = rows; map.cells = new Float32Array(cols * rows);
    }
    map.base = baseLum;
    map.cells.fill(baseLum);
  }

  // 把 ctx 目前的變換套到邏輯座標上，取得畫布上的實際位置。
  function toDevice(ctx, x, y) {
    let m = null;
    try { m = ctx.getTransform(); } catch (e) { return null; }
    if (!m) return null;
    const dpr = ctx._labDpr || 1;
    return { x: (m.a * x + m.c * y + m.e) / dpr, y: (m.b * x + m.d * y + m.f) / dpr };
  }

  // 記錄一塊填色覆蓋的區域亮度（供之後判斷文字要用什麼墨色）。
  function noteFill(ctx, color, x, y, w, h) {
    const map = ctx._labInkMap;
    if (!map || !map.cells) return;
    const rgb = parseColor(color);
    if (!rgb || rgb[3] < 0.45) return;                    // 太透明就不算遮蔽
    const a = toDevice(ctx, x, y), b = toDevice(ctx, x + w, y + h);
    if (!a || !b) return;
    const lum = luminance(rgb);
    const x0 = Math.max(0, Math.floor(Math.min(a.x, b.x) / INK_CELL));
    const x1 = Math.min(map.cols - 1, Math.floor(Math.max(a.x, b.x) / INK_CELL));
    const y0 = Math.max(0, Math.floor(Math.min(a.y, b.y) / INK_CELL));
    const y1 = Math.min(map.rows - 1, Math.floor(Math.max(a.y, b.y) / INK_CELL));
    for (let gy = y0; gy <= y1; gy++) {
      for (let gx = x0; gx <= x1; gx++) map.cells[gy * map.cols + gx] = lum;
    }
  }

  // 查詢某點底下的背景亮度
  function backdropLum(ctx, x, y) {
    const map = ctx._labInkMap;
    if (!map || !map.cells) return themeName() === "light" ? 0.92 : 0.04;
    const p = toDevice(ctx, x, y);
    if (!p) return map.base;
    const gx = Math.max(0, Math.min(map.cols - 1, Math.floor(p.x / INK_CELL)));
    const gy = Math.max(0, Math.min(map.rows - 1, Math.floor(p.y / INK_CELL)));
    return map.cells[gy * map.cols + gx];
  }

  const contrast = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

  /*
   * 把顏色壓暗到指定亮度，但完全保留色相與飽和度比例。
   * 在「線性光」空間等比例縮放三個通道，紅還是紅、綠還是綠，只是變深。
   */
  function toLuminance(rgb, target) {
    const toLinear = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const toSrgb = c => Math.round(255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055));
    const current = luminance(rgb);
    if (current <= 0.001) return rgb;
    const k = Math.max(0.05, target / current);
    return [0, 1, 2].map(i => Math.max(0, Math.min(255, toSrgb(Math.min(1, toLinear(rgb[i]) * k))))).concat([rgb[3]]);
  }

  /*
   * ink(ctx, color, x, y)
   * 傳入原始顏色與參考點，回傳在目前主題下真正該用的顏色。三種情況：
   *   1. 白色系畫在淺背景上 → 換成深墨（最主要的修正）
   *   2. 深色系畫在深背景上 → 換成亮墨
   *   3. 飽和但偏亮的顏色（淺黃、淺橘、粉藍…）在淺背景上對比不足
   *      → 保留色相壓暗，讓能量曲線、磁力線這些「有物理意義的顏色」不會消失
   */
  function ink(ctx, color, x, y) {
    const rgb = parseColor(color);
    if (!rgb) return color;
    const lum = luminance(rgb);
    const chroma = (Math.max(rgb[0], rgb[1], rgb[2]) - Math.min(rgb[0], rgb[1], rgb[2])) / 255;
    const pale = isPaleNeutral(rgb);
    const dark = lum <= 0.12 && chroma <= 0.16;
    const bg = backdropLum(ctx, x, y);

    if (pale && bg > 0.34) {
      // 半透明裝飾線稍微加一點不透明度才看得出來。
      return rgba(LIGHT_INK, rgb[3] < 1 ? Math.min(1, rgb[3] * 1.25) : 1);
    }
    if (dark && bg <= 0.16) {
      return rgba(DARK_INK, rgb[3] < 1 ? Math.min(1, rgb[3] * 1.25) : 1);
    }
    // 只在真的看不清楚時才動，避免無謂地改變配色。
    // 門檻取 WCAG 對非文字圖形要求的 3:1；中間調的灰也一併處理。
    if (!pale && !dark && bg > 0.5 && contrast(lum, bg) < 3.0) {
      const target = (bg + 0.05) / 3.2 - 0.05;
      return rgba(toLuminance(rgb, Math.max(0.02, target)), rgb[3]);
    }
    return color;
  }

  function fmt(n, d) {
    if (!isFinite(n)) return "—";
    d = d == null ? 2 : d;
    const a = Math.abs(n);
    if (a !== 0 && (a >= 1e5 || a < 1e-3)) return n.toExponential(2);
    return n.toFixed(d).replace(/\.?0+$/, m => (m.indexOf(".") >= 0 ? "" : m));
  }

  const el = (tag, cls, parent) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (parent) parent.appendChild(e);
    return e;
  };

  // 每個課程模組有自己的儀器語言；所有實驗由註冊表自動帶入，不必在 84 個檔案裡重複設定。
  const STAGE_BY_MODULE = {
    kinematics: { family: "mechanics", stage: "運動量測台", code: "KIN" },
    newton: { family: "mechanics", stage: "受力分析台", code: "FOR" },
    momentum: { family: "mechanics", stage: "動量量測台", code: "MOM" },
    energy: { family: "mechanics", stage: "能量轉換台", code: "ENG" },
    gravity: { family: "orbital", stage: "軌道觀測台", code: "ORB" },
    shm: { family: "mechanics", stage: "振動量測台", code: "OSC" },
    thermal: { family: "thermal", stage: "熱流量測台", code: "THM" },
    waves: { family: "waves", stage: "波形量測台", code: "WAV" },
    optics: { family: "optics", stage: "光學量測台", code: "OPT" },
    electric: { family: "circuit", stage: "電路量測台", code: "ELC" },
    magnetism: { family: "magnetism", stage: "電磁觀測台", code: "MAG" },
    modern: { family: "modern", stage: "微觀探測台", code: "QNT" }
  };

  function profileFor(id) {
    const modules = window.PhysicsLabCurriculum && window.PhysicsLabCurriculum.modules;
    const module = modules && modules.find(m => m.experiments.some(e => e.id === id));
    const stage = STAGE_BY_MODULE[module && module.id] || { family: "general", stage: "互動量測台", code: "PHY" };
    return Object.assign({ id: id || "", moduleId: module && module.id, moduleNo: module && module.no, moduleTitle: module && module.title }, stage);
  }

  function experimentFor(profile) {
    const modules = window.PhysicsLabCurriculum && window.PhysicsLabCurriculum.modules || [];
    for (const module of modules) {
      const experiment = module.experiments.find(item => item.id === profile.id);
      if (experiment) return experiment;
    }
    return null;
  }

  function actionFor(profile) {
    const actions = {
      mechanics: "先調整一個初始條件或外力，再啟動模型；每次只改變一個變因。",
      orbital: "先設定速度或距離，再比較軌跡與指向圓心的量。",
      thermal: "先選定系統邊界，再只改變一個狀態量，追蹤熱量與溫度。",
      waves: "先固定介質條件，再改變頻率、振幅或相位，鎖定一個觀測點。",
      optics: "先固定光源與元件位置，再改變一個幾何量，對照光路或條紋。",
      circuit: "先確認電路連接，再改變一個元件或電源參數，同時讀取電壓與電流。",
      magnetism: "先預測方向，再切換電流、磁場或運動方向，核對向量與儀表。",
      modern: "先改變一個微觀條件，再從門檻、離散值或統計分布找出規律。"
    };
    return actions[profile.family] || "先調整一個參數，觀察變化後再回到公式判讀。";
  }

  function learningBriefFor(profile) {
    const experiment = experimentFor(profile);
    const points = experiment && Array.isArray(experiment.points) ? experiment.points : [];
    return {
      goal: experiment && experiment.concept || "用可控制的變因與即時讀數，建立現象和物理模型的關係。",
      action: actionFor(profile),
      observe: points[0] || "把畫面中的現象和下方量測讀數一起看。",
      conclude: points[1] || "用讀數或圖形的變化，說明哪一個物理量造成差異。"
    };
  }

  function markGuideStep(node, step) {
    const simRoot = node && node.closest && node.closest(".lab-sim");
    if (simRoot && typeof simRoot._labSetProcedureStep === "function") simRoot._labSetProcedureStep(step);
  }

  /* -------------------------------------------------------------------------
     建置情境（Build context）

     245 個實驗共用 layout() / loop() / 控制項工廠這三個入口，因此只要在這裡
     記錄「這一次建置產生了哪些迴圈與控制項」，就能一次替全部實驗加上
     時間控制、一鍵歸零與量測工具，不必逐檔改寫。

     buildContext 只在 register().build() 執行期間有值。
     ------------------------------------------------------------------------- */
  let buildContext = null;
  const canvasHooks = [];
  const builtHooks = [];

  function currentBuild() { return buildContext; }

  // 讓控制項在「一鍵歸零」時可以回到初始狀態
  function registerControl(reset) {
    if (buildContext && typeof reset === "function") buildContext.controls.push(reset);
  }

  function workflowFor(profile) {
    const subject = profile.moduleTitle || "這個主題";
    const steps = {
      mechanics: ["設定物體與初始條件", "啟動模型並觀察運動", "對照讀數與圖表驗證關係"],
      orbital: ["設定初始條件與尺度", "觀察軌跡或場的演化", "比較模型預測與量測值"],
      thermal: ["設定系統狀態與邊界", "改變熱學條件並觀察交換", "以資料判讀守恆或狀態變化"],
      waves: ["調整波源與介質參數", "播放並鎖定一個觀測點", "比對波形、頻率與相位"],
      optics: ["設定光源與光學元件", "觀察光路、像或條紋", "記錄量測並驗證幾何關係"],
      circuit: ["設定電源與元件參數", "調整電路狀態並讀取儀表", "用讀數或曲線檢查電路定律"],
      magnetism: ["設定電流、磁場或線圈", "顯示方向與作用效果", "比較向量、曲線與計算值"],
      modern: ["選擇微觀條件與材料", "啟動探測或統計過程", "從分布與曲線判讀量子現象"]
    };
    return steps[profile.family] || ["設定 " + subject + " 的參數", "操作模型並觀察現象", "讀取資料並連結公式"];
  }

  function downloadText(filename, text, type) {
    const link = document.createElement("a");
    const url = URL.createObjectURL(new Blob([text], { type: type || "text/plain;charset=utf-8" }));
    link.href = url; link.download = filename; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  /* ----------------------------- 版面 ----------------------------- */
  function layout(root) {
    root.innerHTML = "";
    root.classList.add("lab-sim");
    const profile = root._labProfile || profileFor(root.dataset && root.dataset.simId);
    root._labProfile = profile;
    if (root.dataset) { root.dataset.labFamily = profile.family; root.dataset.labCode = profile.code; }
    root._labReadouts = [];
    const workflow = workflowFor(profile);
    const brief = learningBriefFor(profile);
    const commandBar = el("div", "sim-command-bar", root);
    const commandTitle = el("div", "sim-command-title", commandBar);
    const stageLabel = el("span", "sim-command-stage", commandTitle); stageLabel.textContent = profile.stage;
    const stageMeta = el("span", "sim-command-meta", commandTitle); stageMeta.textContent = "操作 · 量測 · 驗證";
    const commandTools = el("div", "sim-command-tools", commandBar);
    const guideBtn = el("button", "sim-command", commandTools); guideBtn.type = "button"; guideBtn.textContent = "實驗指南"; guideBtn.setAttribute("aria-expanded", "false");
    const stepBtn = el("button", "sim-command", commandTools); stepBtn.type = "button"; stepBtn.textContent = "分步演示";
    const focusBtn = el("button", "sim-command", commandTools); focusBtn.type = "button"; focusBtn.textContent = "專注模式"; focusBtn.setAttribute("aria-pressed", "false");
    const exportBtn = el("button", "sim-command", commandTools); exportBtn.type = "button"; exportBtn.textContent = "匯出讀數";
    const screenBtn = el("button", "sim-command", commandTools); screenBtn.type = "button"; screenBtn.textContent = "截取主畫面";
    const fullBtn = el("button", "sim-command", commandTools); fullBtn.type = "button"; fullBtn.textContent = "全螢幕";

    const learningBrief = el("section", "sim-learning-brief", root);
    const briefHead = el("div", "sim-learning-brief-head", learningBrief);
    const briefKicker = el("span", "sim-learning-brief-kicker", briefHead); briefKicker.textContent = "任務導讀";
    const briefTitle = el("span", "sim-learning-brief-title", briefHead); briefTitle.textContent = "先知道要看什麼，再開始操作";
    const goal = el("p", "sim-learning-goal", learningBrief); goal.textContent = brief.goal;
    const briefSteps = el("dl", "sim-learning-steps", learningBrief);
    [["怎麼做", brief.action], ["盯住什麼", brief.observe], ["做完能說", brief.conclude]].forEach(([label, text]) => {
      const item = el("div", "sim-learning-step", briefSteps);
      const term = el("dt", null, item); term.textContent = label;
      const desc = el("dd", null, item); desc.textContent = text;
    });

    const procedure = el("section", "sim-procedure", root);
    const procedureHead = el("div", "sim-procedure-head", procedure);
    const procedureTitle = el("span", "sim-panel-title", procedureHead); procedureTitle.textContent = "實驗流程";
    const procedureState = el("span", "sim-procedure-state", procedureHead); procedureState.textContent = "準備中";
    const procedureSteps = el("ol", "sim-procedure-steps", procedure);
    const procedureNote = el("p", "sim-procedure-note", procedure); procedureNote.textContent = "每一步都會對應下方可操作的參數、模擬或量測讀數。";
    let activeStep = -1;
    const paintSteps = () => {
      procedureSteps.innerHTML = "";
      workflow.forEach((text, index) => {
        const item = el("li", "sim-procedure-step" + (index === activeStep ? " active" : ""), procedureSteps);
        const number = el("span", "sim-step-number", item); number.textContent = String(index + 1);
        const copy = el("span", "sim-step-copy", item); copy.textContent = text;
      });
      procedureState.textContent = activeStep < 0 ? "準備中" : "第 " + (activeStep + 1) + " / " + workflow.length + " 步";
    };
    const setProcedureStep = step => {
      activeStep = Math.max(0, Math.min(workflow.length - 1, step));
      paintSteps();
    };
    root._labSetProcedureStep = setProcedureStep;
    paintSteps();

    guideBtn.addEventListener("click", () => {
      const visible = root.classList.toggle("show-procedure");
      guideBtn.setAttribute("aria-expanded", String(visible));
      if (visible && activeStep < 0) setProcedureStep(0);
    });
    stepBtn.addEventListener("click", () => {
      root.classList.add("show-procedure"); guideBtn.setAttribute("aria-expanded", "true");
      setProcedureStep((activeStep + 1) % workflow.length);
      procedure.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    focusBtn.addEventListener("click", () => {
      const focused = root.classList.toggle("is-focused");
      focusBtn.setAttribute("aria-pressed", String(focused));
      focusBtn.textContent = focused ? "離開專注" : "專注模式";
    });
    exportBtn.addEventListener("click", () => {
      const rows = [["實驗", profile.id], ["實驗台", profile.stage], ["匯出時間", new Date().toLocaleString("zh-TW")]];
      root._labReadouts.forEach(item => rows.push([item.label, item.value + (item.unit ? " " + item.unit : "")]));
      downloadText("physics-lab-" + profile.id + "-readings.csv", rows.map(row => row.map(value => '"' + String(value).replace(/"/g, '""') + '"').join(",")).join("\n"), "text/csv;charset=utf-8");
    });
    screenBtn.addEventListener("click", () => {
      const canvas = root.querySelector(".sim-visual-panel canvas");
      if (!canvas) return;
      const link = document.createElement("a"); link.href = canvas.toDataURL("image/png"); link.download = "physics-lab-" + profile.id + ".png"; link.click();
    });
    fullBtn.addEventListener("click", () => { if (root.requestFullscreen) root.requestFullscreen().catch(() => {}); });

    /* ---------------------------------------------------------------------
       時間控制列
       PhET 的訪談結論：「學生不會自己找到播放／暫停鍵，但一旦看到就會用。」
       因此這裡不是把它藏進工具選單，而是直接放在實驗台正上方、給明確中文標籤。
       單步與慢動作是碰撞、波相位這類瞬間現象唯一看得清楚的方式。
       建置結束後若發現這個實驗沒有動畫迴圈，整列會自動隱藏。
       --------------------------------------------------------------------- */
    const transport = el("div", "sim-transport", root);
    transport.hidden = true;
    const playBtn = el("button", "sim-transport-play", transport);
    playBtn.type = "button";
    playBtn.setAttribute("aria-label", "播放或暫停模擬");
    const stepBtnT = el("button", "sim-transport-btn", transport);
    stepBtnT.type = "button"; stepBtnT.textContent = "單步"; stepBtnT.title = "前進 1/60 秒後暫停，可逐格觀察";
    const speedWrap = el("div", "sim-speed", transport);
    const speedLabel = el("span", "sim-speed-label", speedWrap); speedLabel.textContent = "速度";
    const speedBtns = [];
    [[0.25, "0.25×"], [0.5, "0.5×"], [1, "1×"], [2, "2×"]].forEach(([value, label]) => {
      const b = el("button", "sim-speed-btn", speedWrap);
      b.type = "button"; b.textContent = label; b.dataset.speed = String(value);
      speedBtns.push(b);
    });
    const transportSpacer = el("div", "sim-transport-spacer", transport);
    const timeLabel = el("span", "sim-transport-time", transport);
    timeLabel.title = "模擬時間";
    const resetBtn = el("button", "sim-transport-reset", transport);
    resetBtn.type = "button"; resetBtn.textContent = "全部重設";
    resetBtn.title = "把所有參數、資料與計時歸零";

    // 建置結束後由 finishBuild() 接上實際的迴圈
    root._labTransport = { transport, playBtn, stepBtnT, speedBtns, timeLabel, resetBtn, transportSpacer };

    const stage = el("div", "sim-stage", root);
    const visual = el("section", "sim-visual-panel", stage);
    const visualHead = el("div", "sim-panel-head", visual);
    const visualTitleBlock = el("div", "sim-visual-title-block", visualHead);
    const visualEyebrow = el("span", "sim-visual-eyebrow", visualTitleBlock); visualEyebrow.textContent = "互動實驗台";
    const visualTitle = el("span", "sim-panel-title", visualTitleBlock); visualTitle.textContent = profile.stage;
    const visualMeta = el("div", "sim-visual-meta", visualHead);
    const visualCode = el("span", "sim-visual-code", visualMeta); visualCode.textContent = profile.code + " / 01";
    const visualState = el("span", "sim-live", visualMeta); visualState.textContent = "LIVE";
    const canvasWrap = el("div", "sim-canvas-wrap", visual);
    canvasWrap._labProfile = profile;
    const instrumentStrip = el("div", "sim-instrument-strip", visual);
    const instrumentCode = el("span", "sim-instrument-code", instrumentStrip); instrumentCode.textContent = profile.code + " · " + (profile.moduleNo ? "模組" + profile.moduleNo : "物理模型");
    const instrumentMode = el("span", "sim-instrument-mode", instrumentStrip); instrumentMode.textContent = "即時量測 / 可調參數";

    const controlDeck = el("section", "sim-control-deck", stage);
    const controlHead = el("div", "sim-panel-head", controlDeck);
    const controlTitle = el("span", "sim-panel-title", controlHead); controlTitle.textContent = "實驗參數";
    const controlHint = el("span", "sim-panel-hint", controlHead); controlHint.textContent = "可即時調整";
    const controls = el("div", "sim-controls", controlDeck);

    const readoutPanel = el("section", "sim-readout-panel", root);
    const readoutHead = el("div", "sim-readout-head", readoutPanel);
    const readoutTitle = el("span", "sim-panel-title", readoutHead); readoutTitle.textContent = "量測讀數";
    const readoutHint = el("span", "sim-panel-hint", readoutHead); readoutHint.textContent = "模型計算";
    const readouts = el("div", "sim-readouts", readoutPanel);
    return { root, profile, workflow, brief, learningBrief, commandBar, procedure, setProcedureStep, stage, visual, canvasWrap, instrumentStrip, controlDeck, controls, readoutPanel, readouts };
  }

  /* --------------------------- 響應式畫布 --------------------------- */
  function createCanvas(wrap, aspect, maxW) {
    aspect = aspect || 0.6;
    maxW = maxW || 780;
    const canvas = el("canvas", "sim-canvas", wrap);
    const ctx = canvas.getContext("2d");
    const cv = { canvas, ctx, W: 640, H: 400, dpr: 1, _resizeCbs: [], profile: wrap._labProfile || profileFor() };

    function fit() {
      const rect = wrap.getBoundingClientRect();
      const w = Math.max(240, Math.min(rect.width || maxW, maxW));
      /*
       * 高度上限
       * 橫向手機的可視高度只剩約 380px，照原本的長寬比算出來的畫布會比整個
       * 螢幕還高，使用者看不到下方的讀數。這裡限制畫布不超過視窗高度的 68%，
       * 讓「畫布 + 讀數」能同時出現。在桌機上這個上限幾乎不會生效。
       * 不用 CSS 的 max-height 是因為那只會把已經畫好的內容壓扁；
       * 在這裡改尺寸，實驗的繪圖程式會依新的 W／H 重新排版。
       */
      const viewportCap = typeof window !== "undefined" && window.innerHeight
        ? Math.max(200, window.innerHeight * 0.68) : Infinity;
      const h = Math.round(Math.min(w * aspect, viewportCap));
      // 2x 已足夠清晰，避免高 DPI 手機以 3x / 4x 重繪每個即時圖表。
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.W = w; cv.H = h; cv.dpr = dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx._labDpr = dpr;
      // 尺寸變了就重建亮度網格，否則墨色判斷會沿用舊格線。
      resetInkMap(ctx, w, h, themeName() === "light" ? 0.92 : 0.04);
    }
    cv.fit = fit;
    cv.onResize = fn => cv._resizeCbs.push(fn);
    cv.clear = c => {
      ctx.save();
      ctx.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0);
      if (c) { ctx.fillStyle = c; ctx.fillRect(0, 0, cv.W, cv.H); }
      else ctx.clearRect(0, 0, cv.W, cv.H);
      ctx.restore();
      // 清空畫面等於背景重設，亮度網格要跟著回到底色。
      const base = c ? luminance(parseColor(c) || [10, 15, 22, 1])
        : (themeName() === "light" ? 0.92 : 0.04);
      resetInkMap(ctx, cv.W, cv.H, base);
    };

    /*
     * 比例尺校準
     * 螢幕上的尺只能量像素，除非實驗告訴我們「幾個像素等於一公尺」。
     * 有呼叫 calibrate() 的實驗才會提供可拖曳的尺，沒校準的就不提供，
     * 以免給出一把讀數沒有物理意義的尺。
     */
    cv.calibrate = (pxPerUnit, unit) => {
      const k = Number(pxPerUnit);
      if (isFinite(k) && k > 0) { cv.pxPerUnit = k; cv.unit = unit || "m"; }
      return cv;
    };

    fit();
    let raf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { fit(); cv._resizeCbs.forEach(f => f()); });
    });
    ro.observe(wrap);
    cv.destroy = () => ro.disconnect();
    // 只有主視覺畫布（canvasWrap 帶有 _labProfile）需要疊上量測工具，
    // 附屬圖表不需要。
    if (buildContext) {
      buildContext.canvases.push(cv);
      if (wrap._labProfile) {
        cv.isStage = true;
        canvasHooks.forEach(fn => { try { fn(cv, wrap, buildContext); } catch (e) { console.warn("畫布掛鉤失敗", e); } });
      }
    }
    return cv;
  }

  /* --------------------------- 動畫迴圈 ---------------------------
     除了原本的播放／暫停，另外提供三件市面模擬器的標準能力：

       · setSpeed()  慢動作。碰撞、波的相位這類「一瞬間」的現象，
                     用 0.25 倍速才看得清楚發生順序。
       · stepOnce()  單步前進一個固定時距，可以逐格檢查。
       · 延後自動播放。PhET 的訪談結論是「模擬啟動時應該幾乎不動」，
                     否則學生會停在觀看而不是動手。因此在建置期間呼叫的
                     start() 只會先畫一格靜止畫面，真正的播放交給使用者按下。
                     建置結束後（例如按鈕觸發的 start()）行為完全不變。
     ---------------------------------------------------------------- */
  const STEP_DT = 1 / 60;

  function loop(step, maxFps) {
    const frameMs = 1000 / clamp(Number(maxFps) || 45, 15, 60);
    let raf = null, running = false, listening = false, last = 0, t = 0;
    let speed = 1;
    let armed = false;               // 建置期要求過自動播放，但被延後了
    let everStarted = false;
    const owner = buildContext;      // 這個迴圈屬於哪一次建置

    function onVisibilityChange() {
      if (!document.hidden && running && !raf) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    }
    function advance(dt) {
      t += dt;
      step(dt, t);
      if (owner && owner.onTick) owner.onTick(dt, t);
    }
    function frame(now) {
      if (!running) return;
      if (document.hidden) { raf = null; last = 0; return; }
      if (!last) {
        last = now;
        step(0, t);
        raf = requestAnimationFrame(frame);
        return;
      }
      if (now - last < frameMs) { raf = requestAnimationFrame(frame); return; }
      const real = Math.min(0.05, (now - last) / 1000);
      last = now;
      advance(real * speed);
      raf = requestAnimationFrame(frame);
    }
    const ctrl = {
      start() {
        // 建置期間的第一次 start()：只畫一格，等使用者自己按播放。
        if (buildContext && buildContext === owner && !everStarted) {
          armed = true; everStarted = true;
          step(0, t);
          return;
        }
        everStarted = true;
        if (running) return;
        running = true; last = 0; armed = false;
        if (!listening) { document.addEventListener("visibilitychange", onVisibilityChange); listening = true; }
        if (!document.hidden) raf = requestAnimationFrame(frame);
      },
      stop() {
        running = false; armed = false;
        if (raf) cancelAnimationFrame(raf);
        raf = null;
        if (listening) { document.removeEventListener("visibilitychange", onVisibilityChange); listening = false; }
      },
      toggle() { running ? ctrl.stop() : ctrl.start(); },
      render() { step(0, t); },
      reset() { t = 0; last = 0; },
      /* 單步：暫停狀態下前進一個固定時距，方便逐格觀察。 */
      stepOnce(dt) {
        if (running) ctrl.stop();
        advance(dt || STEP_DT);
      },
      setSpeed(k) { speed = clamp(Number(k) || 1, 0.1, 4); },
      get speed() { return speed; },
      get t() { return t; },
      get running() { return running; },
      /* 建置期要求過自動播放：時間控制列據此決定要不要顯示播放鍵。 */
      get armed() { return armed; }
    };
    if (buildContext) buildContext.loops.push(ctrl);
    return ctrl;
  }

  /* --------------------------- 控制項 --------------------------- */
  function slider(parent, o) {
    const wrap = el("div", "ctrl-slider", parent);
    const head = el("div", "ctrl-head", wrap);
    const lab = el("span", "ctrl-label", head); lab.textContent = o.label;
    const val = el("span", "ctrl-value", head);
    const input = el("input", null, wrap);
    input.type = "range";
    input.setAttribute("aria-label", o.ariaLabel || o.label || "數值滑桿");
    input.min = o.min; input.max = o.max; input.step = o.step == null ? 1 : o.step;
    input.value = o.value;
    const f = o.fmt || (v => fmt(v, o.digits == null ? 1 : o.digits));
    const show = v => { val.textContent = f(v) + (o.unit ? " " + o.unit : ""); };
    show(+input.value);
    input.addEventListener("input", () => { show(+input.value); o.onInput && o.onInput(+input.value); markGuideStep(wrap, 0); });
    // 一鍵歸零時回到初始值，並觸發實驗自己的 onInput（多半會順便清掉歷史資料）
    registerControl(() => { input.value = o.value; show(+input.value); o.onInput && o.onInput(+input.value); });
    /*
     * 登記給自動探測引擎
     * 探測引擎會掃描這些滑桿、量出「調整它會讓哪個讀數怎麼變」，
     * 因此每個實驗都能自動得知自己的物理關係，不必逐檔撰寫。
     */
    if (buildContext) {
      buildContext.sliders.push({
        el: input,
        label: o.label || o.ariaLabel || "參數",
        unit: o.unit || "",
        min: Number(o.min), max: Number(o.max),
        initial: Number(o.value),
        digits: o.digits == null ? 1 : o.digits,
        read: () => +input.value,
        write(v) {
          input.value = String(v);
          show(+input.value);
          if (o.onInput) o.onInput(+input.value);
        }
      });
    }
    return { el: input, get: () => +input.value, set: v => { input.value = v; show(v); }, label: lab, valueEl: val, showUnit: show };
  }

  function select(parent, o) {
    const wrap = el("div", "ctrl-select", parent);
    if (o.label) { const l = el("div", "ctrl-label", wrap); l.textContent = o.label; }
    const sel = el("select", null, wrap);
    if (o.label) sel.setAttribute("aria-label", o.ariaLabel || o.label);
    o.options.forEach(op => {
      const oe = el("option", null, sel);
      oe.value = op.value; oe.textContent = op.label;
    });
    if (o.value != null) sel.value = o.value;
    sel.addEventListener("change", () => { o.onChange && o.onChange(sel.value); markGuideStep(wrap, 0); });
    const initial = sel.value;
    registerControl(() => { sel.value = initial; o.onChange && o.onChange(sel.value); });
    return { el: sel, get: () => sel.value, set: v => sel.value = v };
  }

  function checkbox(parent, o) {
    const wrap = el("label", "ctrl-check", parent);
    const input = el("input", null, wrap); input.type = "checkbox"; input.checked = !!o.checked;
    const span = el("span", null, wrap); span.textContent = o.label;
    input.addEventListener("change", () => { o.onChange && o.onChange(input.checked); markGuideStep(wrap, 0); });
    registerControl(() => { input.checked = !!o.checked; o.onChange && o.onChange(input.checked); });
    return { el: input, get: () => input.checked, set: v => input.checked = v };
  }

  function buttonRow(parent) { return el("div", "btn-row", parent); }
  function button(row, label, onClick, o) {
    o = o || {};
    const b = el("button", "btn" + (o.primary ? " btn-primary" : ""), row);
    b.type = "button"; b.textContent = label;
    b.addEventListener("click", () => { onClick(); if (o.primary) markGuideStep(row, 1); });
    return b;
  }

  function readout(parent, o) {
    const box = el("div", "readout", parent);
    const v = el("div", "readout-value", box); v.textContent = "—";
    const l = el("div", "readout-label", box); l.textContent = o.label;
    const record = { label: o.label, unit: o.unit || "", value: "—", number: null };
    const simRoot = parent.closest && parent.closest(".lab-sim");
    if (simRoot && simRoot._labReadouts) simRoot._labReadouts.push(record);
    if (buildContext) buildContext.readouts.push(record);
    return {
      set: (val, digits) => {
        record.value = typeof val === "number" ? fmt(val, digits) : val;
        // 保留未經格式化的原始數值：探測引擎若讀四捨五入後的字串，
        // 小數值的相對誤差會很大，冪次律會被算歪（P ∝ V² 會變成 V^1.93）。
        record.number = typeof val === "number" && isFinite(val) ? val : null;
        v.textContent = record.value + (o.unit ? " " + o.unit : "");
      },
      raw: v, box
    };
  }

  /*
   * 控制面板的說明
   * PhET 的訪談結論是「學生只會讀貼在控制項上的文字」「一到三個字最有效」，
   * 整段說明放在面板裡會被跳過，還會把真正的控制項擠到看不見的地方。
   * 因此長度超過一行的說明改成預設收合，需要的人再展開；短提示維持原樣。
   */
  function note(parent, text) {
    const plain = String(text == null ? "" : text).replace(/<[^>]*>/g, "");
    if (plain.length <= 34) {
      const n = el("div", "ctrl-note", parent);
      n.innerHTML = text;
      return n;
    }
    const details = el("details", "ctrl-note ctrl-note-collapsible", parent);
    const summary = el("summary", null, details);
    summary.textContent = "說明";
    const body = el("div", "ctrl-note-body", details);
    body.innerHTML = text;
    return details;
  }

  /*
   * 畫面下方的說明列
   * 同一份設計文件也指出「play area 裡的文字是干擾」。純解說性的長句改用
   * 這個 DOM 說明列呈現，畫布上只留 L =、v =、θ = 這類標示物理量的短標籤。
   */
  function caption(cv, text) {
    const wrap = cv && cv.canvas && cv.canvas.parentNode;
    if (!wrap) return null;
    let node = wrap._labCaption;
    if (!node) {
      node = el("p", "sim-caption");
      wrap.appendChild(node);
      wrap._labCaption = node;
    }
    node.textContent = text;
    return node;
  }

  function section(parent, text) {
    const s = el("div", "ctrl-section", parent); s.textContent = text; return s;
  }

  function stepper(parent, o) {
    const wrap = el("div", "ctrl-stepper", parent);
    if (o.label) { const l = el("div", "ctrl-label", wrap); l.innerHTML = o.label; }
    const box = el("div", "stepper-box", wrap);
    const dec = el("button", "stepper-btn", box); dec.type = "button"; dec.textContent = "−";
    const val = el("span", "stepper-val", box);
    if (o.unit) { const u = el("span", "stepper-unit", box); u.textContent = o.unit; }
    const inc = el("button", "stepper-btn", box); inc.type = "button"; inc.textContent = "+";
    const name = o.ariaLabel || o.label || "數值";
    dec.setAttribute("aria-label", name + " 減少");
    inc.setAttribute("aria-label", name + " 增加");
    const step = o.step == null ? 1 : o.step, dg = o.digits == null ? 0 : o.digits;
    let v = o.value;
    const show = () => { val.textContent = typeof o.format === "function" ? o.format(v) : (+v).toFixed(dg); };
    const set = (nv, fire) => { v = clamp(Math.round(nv / step) * step, o.min, o.max); show(); if (fire !== false && o.onInput) o.onInput(v); if (fire !== false) markGuideStep(wrap, 0); };
    dec.addEventListener("click", () => set(v - step));
    inc.addEventListener("click", () => set(v + step));
    show();
    registerControl(() => set(o.value));
    /*
     * 步進器和滑桿一樣是「有範圍的數值輸入」，同樣要登記給自動探測引擎。
     * 少了這一步，只用步進器的實驗（拋體、雙狹縫、光電效應…）就完全探測不到。
     */
    if (buildContext) {
      buildContext.sliders.push({
        el: box,
        label: (o.label || o.ariaLabel || "參數").replace(/<[^>]*>/g, ""),
        unit: o.unit || "",
        min: Number(o.min), max: Number(o.max),
        initial: Number(o.value),
        digits: dg,
        read: () => v,
        write(nv) { set(nv); }
      });
    }
    return { get: () => v, set: nv => set(nv, false), el: box };
  }

  function chipGroup(parent, o) {
    const row = el("div", "chip-row", parent);
    const multi = !!o.multi;
    let value = multi ? new Set(o.value || []) : o.value;
    const chips = [];
    o.options.forEach(op => {
      const c = el("button", "chip", row); c.type = "button"; c.innerHTML = op.label;
      if (op.color) c.style.setProperty("--chip", op.color);
      const isOn = () => multi ? value.has(op.value) : value === op.value;
      const paint = () => c.classList.toggle("active", isOn());
      c.addEventListener("click", () => {
        if (multi) { value.has(op.value) ? value.delete(op.value) : value.add(op.value); }
        else value = op.value;
        chips.forEach(x => x.paint());
        if (o.onChange) o.onChange(multi ? [...value] : value, op.value);
        markGuideStep(row, 0);
      });
      chips.push({ paint }); paint();
    });
    const initial = multi ? [...(o.value || [])] : o.value;
    registerControl(() => {
      value = multi ? new Set(initial) : initial;
      chips.forEach(x => x.paint());
      if (o.onChange) o.onChange(multi ? [...value] : value);
    });
    return { get: () => multi ? [...value] : value, has: v => multi && value.has(v), set: v => { value = multi ? new Set(v) : v; chips.forEach(x => x.paint()); } };
  }

  function charts(parent) { return el("div", "sim-charts", parent); }
  function chart(container, o) {
    o = o || {};
    const w = el("div", "sim-chart", container);
    if (o.title) { const t = el("div", "chart-title", w); t.textContent = o.title; }
    const c = createCanvas(w, o.aspect || 0.6);
    if (o.cap) { const p = el("div", "cap", w); p.textContent = o.cap; }
    return c;
  }

  function instrumentChrome(ctx, W, H, profile) {
    const family = profile && profile.family || "general";
    const light = themeName() === "light";
    // 儀器台外框在淺色主題要用深墨，否則整條刻度尺會消失在白底上。
    const faint = light ? "rgba(22,32,46,0.22)" : "rgba(255,255,255,0.10)";
    const dim = light ? "rgba(22,32,46,0.10)" : "rgba(255,255,255,0.055)";
    const accent = col("m-color", col("accent"));
    ctx.save(); ctx.lineWidth = 1; ctx.strokeStyle = faint; ctx.fillStyle = dim;
    const y = H - 12;
    // 淺色底下同樣的低透明度會幾乎看不見，統一放大裝飾線的不透明度。
    const tint = (r, g, b, a) => "rgba(" + r + "," + g + "," + b + "," + Math.min(0.85, a * (light ? 2.6 : 1)) + ")";
    if (family === "mechanics" || family === "optics") {
      ctx.fillRect(14, y, W - 28, 5); ctx.strokeRect(14.5, y + 0.5, W - 29, 4);
      for (let x = 24; x < W - 20; x += 24) { ctx.beginPath(); ctx.moveTo(x, y + 1); ctx.lineTo(x, y + (x % 72 === 24 ? 5 : 3)); ctx.stroke(); }
    } else if (family === "circuit") {
      const py = H - 16; ctx.strokeStyle = tint(42, 116, 214, 0.14);
      [[16, 76], [W * 0.30, W * 0.53], [W * 0.68, W - 18]].forEach((span, i) => {
        ctx.beginPath(); ctx.moveTo(span[0], py + (i % 2 ? 5 : 0)); ctx.lineTo(span[1], py + (i % 2 ? 5 : 0)); ctx.stroke();
        [span[0], span[1]].forEach(x => { ctx.beginPath(); ctx.arc(x, py + (i % 2 ? 5 : 0), 2.3, 0, TAU); ctx.fillStyle = tint(42, 116, 214, 0.22); ctx.fill(); });
      });
    } else if (family === "thermal") {
      ctx.fillRect(14, y - 2, W - 28, 7); ctx.strokeRect(14.5, y - 1.5, W - 29, 6);
      for (let x = 26; x < W - 20; x += 20) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 8, y); ctx.stroke(); }
    } else if (family === "waves") {
      ctx.strokeStyle = tint(20, 150, 168, 0.16); ctx.beginPath();
      for (let x = 14; x <= W - 14; x += 5) { const yy = y + Math.sin((x - 14) / 14) * 2.5; x === 14 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); }
      ctx.stroke();
    } else if (family === "magnetism") {
      ctx.strokeStyle = tint(140, 92, 224, 0.14);
      for (let x = 24; x < W - 22; x += 30) { ctx.beginPath(); ctx.arc(x, y - 1, 9, Math.PI, 0); ctx.stroke(); }
    } else if (family === "orbital" || family === "modern") {
      ctx.strokeStyle = tint(42, 116, 214, 0.12);
      for (let x = 20; x < W - 16; x += 28) { ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.stroke(); }
    }
    ctx.fillStyle = accent; ctx.globalAlpha = light ? 0.78 : 0.62; ctx.font = "8px system-ui, sans-serif";
    ctx.fillText((profile && profile.code || "PHY") + " / CALIBRATED", 15, H - 18);
    ctx.textAlign = "right"; ctx.fillStyle = faint; ctx.fillText("INTERACTIVE LAB", W - 15, H - 18);
    ctx.restore();
  }

  /* --------------------------- 繪圖助手 --------------------------- */
  const D = {
    grid(ctx, x, y, w, h, step, color) {
      ctx.save();
      ctx.strokeStyle = ink(ctx, color || "rgba(255,255,255,0.05)", x + w / 2, y + h / 2);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let gx = x; gx <= x + w + 0.5; gx += step) { ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); }
      for (let gy = y; gy <= y + h + 0.5; gy += step) { ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); }
      ctx.stroke(); ctx.restore();
    },
    line(ctx, x1, y1, x2, y2, color, width, dash) {
      ctx.save();
      ctx.strokeStyle = ink(ctx, color, (x1 + x2) / 2, (y1 + y2) / 2);
      ctx.lineWidth = width || 1.5;
      if (dash) ctx.setLineDash(dash);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
    },
    arrow(ctx, x1, y1, x2, y2, o) {
      o = o || {};
      const color = ink(ctx, o.color || "#fff", (x1 + x2) / 2, (y1 + y2) / 2), w = o.width || 2, head = o.head || 9;
      const ang = Math.atan2(y2 - y1, x2 - x1);
      const len = Math.hypot(x2 - x1, y2 - y1);
      if (len < 0.5) return;
      ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = w;
      if (o.dash) ctx.setLineDash(o.dash);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.setLineDash([]);
      const hs = Math.min(head, len);
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - hs * Math.cos(ang - 0.42), y2 - hs * Math.sin(ang - 0.42));
      ctx.lineTo(x2 - hs * Math.cos(ang + 0.42), y2 - hs * Math.sin(ang + 0.42));
      ctx.closePath(); ctx.fill();
      if (o.label) { D.text(ctx, o.label, x2 + (o.lx || 6), y2 + (o.ly || -6), { color, size: o.lsize || 12 }); }
      ctx.restore();
    },
    disc(ctx, x, y, r, o) {
      o = o || {};
      ctx.save();
      if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowSize || 16; }
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
      if (o.fill) {
        const fill = ink(ctx, o.fill, x, y);
        ctx.fillStyle = fill; ctx.fill();
        // 圓內接正方形，避免把角落誤標成被覆蓋
        const s = r * 1.414;
        noteFill(ctx, fill, x - s / 2, y - s / 2, s, s);
      }
      ctx.shadowBlur = 0;
      if (o.stroke) { ctx.lineWidth = o.width || 2; ctx.strokeStyle = ink(ctx, o.stroke, x, y - r); ctx.stroke(); }
      ctx.restore();
    },
    ring(ctx, x, y, r, color, width, dash) {
      ctx.save(); ctx.strokeStyle = ink(ctx, color, x, y - r); ctx.lineWidth = width || 1.5;
      if (dash) ctx.setLineDash(dash);
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.restore();
    },
    rect(ctx, x, y, w, h, o) {
      o = o || {}; const r = o.r || 0;
      ctx.save();
      ctx.beginPath();
      if (r > 0) {
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
      } else ctx.rect(x, y, w, h);
      ctx.closePath();
      if (o.fill) {
        const fill = ink(ctx, o.fill, x + w / 2, y + h / 2);
        ctx.fillStyle = fill; ctx.fill();
        noteFill(ctx, fill, x, y, w, h);
      }
      if (o.stroke) { ctx.lineWidth = o.width || 1.5; ctx.strokeStyle = ink(ctx, o.stroke, x + w / 2, y); ctx.stroke(); }
      ctx.restore();
    },
    text(ctx, str, x, y, o) {
      o = o || {};
      const size = o.size || 13;
      ctx.save();
      // 取字身中段當取樣點，比基線更貼近文字實際覆蓋的位置。
      ctx.fillStyle = ink(ctx, o.color || "#e6edf3", x, y - size * 0.32);
      ctx.font = (o.weight || "") + " " + size + "px 'Segoe UI','PingFang TC','Microsoft JhengHei',system-ui,sans-serif";
      ctx.textAlign = o.align || "left";
      ctx.textBaseline = o.baseline || "alphabetic";
      ctx.fillText(str, x, y);
      ctx.restore();
    },
    spring(ctx, x1, y1, x2, y2, coils, w, color) {
      const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
      if (!isFinite(len) || len < 0.001) return;
      const ux = dx / len, uy = dy / len, px = -uy, py = ux;
      const n = (coils || 10) * 2, pad = 0.12;
      ctx.save();
      ctx.strokeStyle = ink(ctx, color || "#9aa8b8", (x1 + x2) / 2, (y1 + y2) / 2);
      ctx.lineWidth = 2; ctx.beginPath();
      ctx.moveTo(x1, y1);
      for (let i = 0; i <= n; i++) {
        const f = pad + (1 - 2 * pad) * (i / n);
        const bx = x1 + dx * f, by = y1 + dy * f;
        const off = (i % 2 === 0 ? 0 : (i % 4 === 1 ? (w || 8) : -(w || 8)));
        ctx.lineTo(bx + px * off, by + py * off);
      }
      ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
    },
    // 陰影漸層、儀器格線與內框，讓所有模擬共享實驗台的質感。
    bg(cv) {
      const ctx = cv.ctx, W = cv.W, H = cv.H;
      const top = col("sim-bg-1", "#0a0f16"), bottom = col("sim-bg-2", "#0c1219");
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, top);
      g.addColorStop(1, bottom);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // 每一影格由這裡重設亮度網格：底色是什麼，白色系顏色就會據此決定要不要翻墨。
      resetInkMap(ctx, W, H, luminance(parseColor(bottom) || [10, 15, 22, 1]));
      const light = themeName() === "light";
      const rg = ctx.createRadialGradient(W / 2, H * 0.42, Math.min(W, H) * 0.15, W / 2, H * 0.5, Math.max(W, H) * 0.72);
      rg.addColorStop(0, "rgba(0,0,0,0)");
      rg.addColorStop(1, light ? "rgba(30,50,90,0.05)" : "rgba(0,0,0,0.30)");
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      const step = Math.max(24, Math.round(Math.min(W, H) / 11));
      ctx.save();
      ctx.strokeStyle = light ? "rgba(30,50,90,0.055)" : "rgba(255,255,255,0.035)";
      ctx.lineWidth = 1; ctx.beginPath();
      for (let x = step; x < W; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
      for (let y = step; y < H; y += step) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.stroke();
      ctx.strokeStyle = light ? "rgba(30,50,90,0.14)" : "rgba(255,255,255,0.075)";
      ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
      ctx.strokeStyle = col("m-color", col("accent")); ctx.globalAlpha = 0.55; ctx.lineWidth = 1.4;
      const mark = 10;
      [[8, 8, 1, 1], [W - 8, 8, -1, 1], [8, H - 8, 1, -1], [W - 8, H - 8, -1, -1]].forEach(p => {
        ctx.beginPath(); ctx.moveTo(p[0], p[1] + p[3] * mark); ctx.lineTo(p[0], p[1]); ctx.lineTo(p[0] + p[2] * mark, p[1]); ctx.stroke();
      });
      ctx.restore();
      instrumentChrome(ctx, W, H, cv.profile);
    }
  };

  /* ---------------------- 可重複使用的 Graph 座標系 ---------------------- */
  function graph(cv, box, dom) {
    const ctx = cv.ctx;
    const X = dx => box.x + (dx - dom.x0) / (dom.x1 - dom.x0) * box.w;
    const Y = dy => box.y + box.h - (dy - dom.y0) / (dom.y1 - dom.y0) * box.h;
    const g = {
      X, Y, box, dom,
      frame(o) {
        o = o || {};
        D.rect(ctx, box.x, box.y, box.w, box.h, { fill: col("sim-bg-1", "#0a0f16"), stroke: col("border", "#26303d"), width: 1, r: 7 });
        // 零軸
        if (dom.y0 < 0 && dom.y1 > 0) D.line(ctx, box.x, Y(0), box.x + box.w, Y(0), col("text-faint", "#62707f"), 1);
        if (dom.x0 < 0 && dom.x1 > 0) D.line(ctx, X(0), box.y, X(0), box.y + box.h, col("text-faint", "#62707f"), 1);
        if (o.ticks !== false) {
          const n = o.tickCount || 4;
          for (let i = 0; i <= n; i++) {
            const xv = lerp(dom.x0, dom.x1, i / n), yv = lerp(dom.y0, dom.y1, i / n);
            D.text(ctx, fmt(xv, Math.abs(dom.x1 - dom.x0) < 2 ? 2 : 1), X(xv), box.y + box.h + 13, { color: col("text-faint"), size: 8.5, align: "center" });
            D.text(ctx, fmt(yv, Math.abs(dom.y1 - dom.y0) < 2 ? 2 : 1), box.x - 5, Y(yv) + 3, { color: col("text-faint"), size: 8.5, align: "right" });
          }
        }
        if (o.xlabel) D.text(ctx, o.xlabel, box.x + box.w - 4, box.y + box.h - 6, { color: col("text-faint"), size: 11, align: "right" });
        if (o.ylabel) D.text(ctx, o.ylabel, box.x + 6, box.y + 12, { color: col("text-faint"), size: 11 });
        if (o.title) D.text(ctx, o.title, box.x + box.w / 2, box.y - 6, { color: col("text-dim"), size: 11.5, align: "center" });
      },
      grid(nx, ny) {
        const light = themeName() === "light";
        ctx.save(); ctx.strokeStyle = light ? "rgba(30,50,90,0.13)" : "rgba(255,255,255,0.055)"; ctx.lineWidth = 1; ctx.beginPath();
        for (let i = 1; i < nx; i++) { const gx = box.x + box.w * i / nx; ctx.moveTo(gx, box.y); ctx.lineTo(gx, box.y + box.h); }
        for (let j = 1; j < ny; j++) { const gy = box.y + box.h * j / ny; ctx.moveTo(box.x, gy); ctx.lineTo(box.x + box.w, gy); }
        ctx.stroke(); ctx.restore();
      },
      curve(pts, o) {
        o = o || {}; if (pts.length < 2) return;
        ctx.save(); ctx.beginPath();
        ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
        ctx.strokeStyle = o.color || col("accent"); ctx.lineWidth = o.width || 2;
        if (o.dash) ctx.setLineDash(o.dash);
        ctx.beginPath();
        pts.forEach((p, i) => { const px = X(p[0]), py = Y(p[1]); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
        ctx.stroke(); ctx.restore();
      },
      fn(f, o) {
        o = o || {}; const n = o.samples || 160, pts = [];
        for (let i = 0; i <= n; i++) { const x = lerp(dom.x0, dom.x1, i / n); pts.push([x, f(x)]); }
        g.curve(pts, o);
      },
      area(pts, o) {
        o = o || {}; if (pts.length < 2) return;
        ctx.save(); ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
        ctx.beginPath();
        ctx.moveTo(X(pts[0][0]), Y(0));
        pts.forEach(p => ctx.lineTo(X(p[0]), Y(p[1])));
        ctx.lineTo(X(pts[pts.length - 1][0]), Y(0));
        ctx.closePath(); ctx.fillStyle = o.fill || "rgba(52,211,196,0.15)"; ctx.fill(); ctx.restore();
      },
      dot(x, y, o) { o = o || {}; D.disc(ctx, X(x), Y(y), o.r || 4, { fill: o.color || col("accent-2"), glow: o.glow }); },
      vline(x, o) { o = o || {}; D.line(ctx, X(x), box.y, X(x), box.y + box.h, o.color || col("accent-2"), o.width || 1.5, o.dash); },
      hline(y, o) { o = o || {}; D.line(ctx, box.x, Y(y), box.x + box.w, Y(y), o.color || col("accent-2"), o.width || 1.5, o.dash); },
      label(x, y, str, o) { o = o || {}; D.text(ctx, str, X(x) + (o.dx || 0), Y(y) + (o.dy || 0), o); }
    };
    return g;
  }

  /* -------------------------------------------------------------------------
     建置收尾：把時間控制列、一鍵歸零與量測工具接到這一次建置的產物上。
     ------------------------------------------------------------------------- */
  function finishBuild(context, api) {
    const root = context.root;
    const ui = root._labTransport;
    if (!ui) return;

    const loops = context.loops;
    // 沒有動畫迴圈的實驗（純靜態圖解）不需要播放控制，只留重設。
    const animated = loops.length > 0;
    ui.transport.hidden = false;
    ui.playBtn.hidden = !animated;
    ui.stepBtnT.hidden = !animated;
    ui.timeLabel.hidden = !animated;
    Array.from(ui.transport.querySelectorAll(".sim-speed")).forEach(node => { node.hidden = !animated; });

    const primary = loops[0] || null;
    const anyRunning = () => loops.some(l => l.running);

    // wiggle-me 只要使用者開始操作就收起來（PhET：引起注意，但不要一直干擾）
    function stopWiggle() {
      ui.playBtn.classList.remove("wiggle");
      root.classList.remove("show-wiggle");
    }

    function paint() {
      const running = anyRunning();
      ui.playBtn.textContent = running ? "暫停" : "播放";
      ui.playBtn.classList.toggle("is-playing", running);
      ui.playBtn.setAttribute("aria-pressed", String(running));
      ui.stepBtnT.disabled = running;
      if (primary) ui.timeLabel.textContent = "t = " + primary.t.toFixed(2) + " s";
      const speed = primary ? primary.speed : 1;
      ui.speedBtns.forEach(b => b.classList.toggle("active", Number(b.dataset.speed) === speed));
    }

    ui.playBtn.addEventListener("click", () => {
      if (anyRunning()) loops.forEach(l => l.stop());
      else loops.forEach(l => l.start());
      paint();
      stopWiggle();
    });
    ui.stepBtnT.addEventListener("click", () => {
      loops.forEach(l => l.stepOnce());
      paint();
      stopWiggle();
    });
    ui.speedBtns.forEach(b => b.addEventListener("click", () => {
      loops.forEach(l => l.setSpeed(Number(b.dataset.speed)));
      paint();
    }));
    ui.resetBtn.addEventListener("click", () => {
      loops.forEach(l => { l.stop(); l.reset(); });
      // 逐一還原控制項；它們各自的 onInput 多半也會清掉實驗內部的歷史資料。
      context.controls.forEach(reset => { try { reset(); } catch (e) { console.warn("控制項重設失敗", e); } });
      if (context.tools && context.tools.reset) context.tools.reset();
      if (api && typeof api.rerender === "function") { try { api.rerender(); } catch (e) {} }
      loops.forEach(l => l.render());
      paint();
    });

    // 模擬時間每半秒更新一次即可，不必每個影格都改 DOM。
    context.onTick = (function () {
      let acc = 0;
      return dt => {
        acc += dt;
        if (acc >= 0.25) { acc = 0; paint(); }
        if (context.tools && context.tools.tick) context.tools.tick(dt);
      };
    })();

    /*
     * 進場不自動播放（依 PhET 訪談結論）。
     * 建置期要求過自動播放的實驗，這裡改成停在第一格，並讓播放鍵抖動一下
     * 指出「從這裡開始」——也就是 PhET 說的 wiggle-me。
     */
    if (animated && loops.some(l => l.armed)) {
      root.classList.add("show-wiggle");
      ui.playBtn.classList.add("wiggle");
      setTimeout(stopWiggle, 6000);
      root.addEventListener("pointerdown", stopWiggle, { once: true });
    }

    paint();
    builtHooks.forEach(fn => { try { fn(context, api); } catch (e) { console.warn("建置掛鉤失敗", e); } });
  }

  /* --------------------------- 註冊表 --------------------------- */
  const registry = {};
  const PhysicsLab = {
    _registry: registry,
    register(id, def) {
      registry[id] = Object.assign({}, def, {
        build(root) {
          const profile = profileFor(id);
          root._labProfile = profile;
          if (root.dataset) root.dataset.simId = id;
          const previous = buildContext;
          const context = { root, id, profile, loops: [], controls: [], canvases: [], sliders: [], readouts: [], tools: null, onTick: null };
          buildContext = context;
          let api;
          try {
            api = def.build(root);
          } finally {
            buildContext = previous;
          }
          try { finishBuild(context, api); } catch (e) { console.warn("建置收尾失敗：" + id, e); }
          // 把停止流程接上，離開實驗時一併清掉工具層與計時器。
          if (api && typeof api.stop === "function") {
            const originalStop = api.stop;
            api.stop = function () {
              try { if (context.tools && context.tools.destroy) context.tools.destroy(); } catch (e) {}
              return originalStop.apply(this, arguments);
            };
          }
          return api;
        }
      });
    },
    get(id) { return registry[id]; },
    has(id) { return !!registry[id]; },
    ids() { return Object.keys(registry); },
    // 對外助手
    ui: { layout, slider, select, checkbox, buttonRow, button, readout, note, caption, section, stepper, chipGroup, charts, chart },
    canvas: { create: createCanvas },
    draw: D,
    graph,
    loop,
    col, fmt, clamp, lerp, TAU, el,
    /* 給工具層（sim-tools.js）用的內部掛鉤 */
    _hooks: {
      onStageCanvas(fn) { canvasHooks.push(fn); },
      onBuilt(fn) { builtHooks.push(fn); },
      current: currentBuild
    },
    // 主題工具：新寫的實驗可直接用，不必再自己判斷深淺色。
    theme: {
      name: themeName,
      isLight: () => themeName() === "light",
      ink, luminance, parseColor,
      /* 畫在實驗台背景上的中性裝飾線／面。深色主題是半透明白，淺色主題自動換成半透明深墨。 */
      pale(alpha) {
        const a = alpha == null ? 0.12 : alpha;
        return themeName() === "light" ? rgba(LIGHT_INK, Math.min(0.9, a * 1.7)) : rgba([255, 255, 255], a);
      },
      /* 需要「比背景更暗一階」的襯底面（例如嵌在畫面裡的小圖表底板）。 */
      shade(alpha) {
        const a = alpha == null ? 0.5 : alpha;
        return themeName() === "light" ? "rgba(226,233,243," + Math.min(1, a + 0.4) + ")" : "rgba(8,13,20," + a + ")";
      }
    }
  };
  window.PhysicsLab = PhysicsLab;
})();
