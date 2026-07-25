/*
 * app.js — 應用外殼
 * 建立側邊目錄、首頁模組卡片、實驗頁面（模擬 + 教材）、搜尋、
 * 學習進度、深／淺色主題、上一個／下一個與鍵盤導覽，並註冊 PWA。
 */
(function () {
  "use strict";
  const C = window.PhysicsLabCurriculum;
  const PL = window.PhysicsLab;
  const $ = (s, r) => (r || document).querySelector(s);
  const el = PL.el;

  // 建立扁平的實驗索引（含所屬模組），供導覽與搜尋使用
  const FLAT = [];
  C.modules.forEach(m => m.experiments.forEach((e, i) => FLAT.push({ exp: e, mod: m, indexInMod: i })));
  const byId = {};
  FLAT.forEach((f, i) => { f.order = i; byId[f.exp.id] = f; });
  const LEARNING_PATHS = Array.isArray(C.learningPaths) ? C.learningPaths : [];
  let activeLearningPath = LEARNING_PATHS[0] ? LEARNING_PATHS[0].id : "";
  const TEXTBOOK_BRIDGES = {
    kinematics: { junior: "國中自然：速率、平均速度與運動記錄", senior: "高中物理：直線運動、向量與運動圖像", next: "大學普通物理：運動的微分與積分描述", observe: "固定其他條件，只改變一個初始量，對照位置、速度、加速度與圖形。", exam: "遇到題目先選定參考方向，再用圖形的斜率或面積把文字情境翻成物理量。" },
    newton: { junior: "國中自然：力、摩擦力與生活中的運動", senior: "高中物理：牛頓運動定律、受力圖與平衡", next: "大學力學：多自由度系統與拉格朗日建模", observe: "先辨認每一個力的方向，再改變外力、質量或摩擦力，觀察加速度與平衡如何改變。", exam: "遇到題目先畫受力圖，選座標軸後才列合力方程；摩擦力方向要看相對滑動趨勢。" },
    momentum: { junior: "國中自然：碰撞、反作用與安全緩衝", senior: "高中物理：動量、衝量與碰撞守恆", next: "大學力學：質心系與多維碰撞", observe: "比較作用前後的速度與方向，先圈出系統邊界，再看總量是否改變。", exam: "先判斷碰撞時間內外力衝量是否可忽略；能守恆的是系統總動量，不一定是每個物體的動量。" },
    energy: { junior: "國中自然：能量轉換、功與簡單機械", senior: "高中物理：功能定理、位能與力學能守恆", next: "大學力學：保守力、勢能函數與廣義能量", observe: "追蹤同一時刻的動能、位能與耗散能，並比較總量是否維持不變。", exam: "先選系統與參考面，再判斷摩擦、外力或彈力是否讓你能直接使用能量守恆。" },
    gravity: { junior: "國中自然：重力、重量與天體觀察", senior: "高中物理：圓周運動、萬有引力與衛星", next: "大學力學：軌道、角動量與二體問題", observe: "分開看速度方向、加速度方向與向心力來源，再調整半徑或速率比較關係。", exam: "不要把向心力當成新的一種力；先找出是哪一個真實力提供指向圓心的合力。" },
    shm: { junior: "國中自然：週期運動、擺與彈簧", senior: "高中物理：簡諧運動、週期、相位與共振", next: "大學物理：微分方程、相空間與受迫振動", observe: "改變振幅、質量或勁度後，同時看位置、速度、能量與時間圖形的相位關係。", exam: "先辨認平衡位置與恢復力方向，再從週期、振幅或相位讀出題目要求的量。" },
    thermal: { junior: "國中自然：溫度、熱傳遞與物態變化", senior: "高中物理：熱力學、氣體、流體與熱機", next: "大學熱學：狀態方程、熵與不可逆過程", observe: "先分清系統吸熱或放熱，再改變一個狀態量，對照溫度、壓力、體積與能量。", exam: "先寫出系統邊界與能量流向；熱、溫度與內能不是同一個量，單位與守恆條件也不同。" },
    waves: { junior: "國中自然：波、聲音與振動現象", senior: "高中物理：波速、疊加、干涉、駐波與都卜勒效應", next: "大學物理：傅立葉分析、波動方程與頻譜", observe: "固定介質條件後改變頻率、振幅或相位，觀察波長、節點與合成波如何變化。", exam: "先寫 v=fλ，再依題意判斷哪一個量由波源決定、哪一個量由介質決定。" },
    optics: { junior: "國中自然：光的直進、反射、折射與色光", senior: "高中物理：幾何光學、干涉、繞射與偏振", next: "大學光學：波前、近場繞射與光譜", observe: "改變光源、元件位置或波長，對照光路、像的位置、條紋或光強分布。", exam: "先畫光路或幾何圖，標出已知距離與角度；再決定應使用成像、折射或波動關係。" },
    electric: { junior: "國中自然：電流、電壓、電阻與生活電路", senior: "高中物理：電場、直流電路、電容與交流電路", next: "大學電磁學：微分方程、頻率響應與訊號處理", observe: "每次只改一個元件或電源參數，同時讀取電壓、電流與圖形，找出因果關係。", exam: "先標示電流方向、節點與量測位置；串並聯、基爾霍夫定律與能量觀點要依電路結構選用。" },
    magnetism: { junior: "國中自然：磁鐵、磁場與電流磁效應", senior: "高中物理：安培力、電磁感應、馬達與發電機", next: "大學電磁學：場的疊加、畢奧－沙伐定律與感應方程", observe: "切換電流、磁場或運動方向，先預測再核對向量、指針與感應電壓的方向。", exam: "方向題先用右手定則或楞次定律，大小題再代入向量夾角與有效長度。" },
    modern: { junior: "國中自然：原子、輻射、光譜與宇宙觀察", senior: "高中物理：光電效應、原子模型、核物理與相對論", next: "大學現代物理：量子態、能階與統計詮釋", observe: "改變能量尺度、波長或量子數，觀察量測值是否呈現門檻、離散或統計分布。", exam: "先辨認題目是守恆、量子化、相對論或統計問題；不要把微觀事件的隨機性當成公式失效。" }
  };

  function auditCurriculum() {
    const ids = FLAT.map(f => f.exp.id);
    const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
    const registeredIds = PL.ids ? PL.ids() : [];
    const registered = new Set(registeredIds);
    const expected = new Set(ids);
    const missingSimulations = ids.filter(id => !registered.has(id));
    const extraSimulations = registeredIds.filter(id => !expected.has(id));
    const audit = {
      modules: C.totalModules,
      experiments: ids.length,
      registeredSimulations: registeredIds.length,
      duplicateIds,
      missingSimulations,
      extraSimulations
    };
    window.PhysicsLabAudit = audit;
    if (duplicateIds.length || missingSimulations.length || extraSimulations.length) {
      console.error("物理實驗室課程稽核失敗", audit);
    }
    return audit;
  }

  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  let viewed = new Set(store.get("pl-progress", []));
  let currentSim = null;
  let currentId = null;
  let initialized = false;
  const ACCESS_HASH = "faf16b5c720233e537cc50efe380a2170b2a2fd339ae6f9f3f74465cef67e8cd";

  /* ------------------------------- 主題 ------------------------------- */
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    store.set("pl-theme", t);
    const btn = $("#theme-toggle");
    if (btn) btn.innerHTML = t === "light" ? moonIcon + "<span>深色</span>" : sunIcon + "<span>淺色</span>";
    // 主題切換後重繪目前模擬
    if (currentSim && currentSim.rerender) currentSim.rerender();
  }
  const sunIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  const moonIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>';

  /* ------------------------------- 側邊目錄 ------------------------------- */
  function buildSidebar() {
    const wrap = $("#module-list");
    wrap.innerHTML = "";
    C.modules.forEach((m, moduleIndex) => {
      const mod = el("div", "module", wrap);
      mod.style.setProperty("--m-color", m.color);
      mod.dataset.mod = m.id;
      const head = el("div", "module-head", mod);
      const no = el("div", "module-no", head); no.textContent = String(moduleIndex + 1).padStart(2, "0");
      const t = el("div", "module-title", head); t.innerHTML = m.title + '<span class="track">' + m.track + "</span>";
      const car = el("div", "module-caret", head); car.textContent = "▶";
      head.addEventListener("click", () => mod.classList.toggle("open"));

      const list = el("div", "exp-list", mod);
      m.experiments.forEach((e, i) => {
        const item = el("div", "exp-item", list);
        item.dataset.id = e.id;
        const idx = el("div", "idx", item); idx.textContent = i + 1;
        const name = el("div", "exp-name", item); name.textContent = e.title;
        if (e.interactive) { const tag = el("span", "tag-int", item); tag.textContent = "互動"; }
        const chk = el("span", "check", item); chk.textContent = "✓";
        item.addEventListener("click", () => location.hash = "#" + e.id);
      });
    });
    refreshViewedMarks();
  }

  /* ------------------------------- 首頁 ------------------------------- */
  function getPathContext(id) {
    for (const path of LEARNING_PATHS) {
      const sequence = [];
      path.stages.forEach((stage, stageIndex) => {
        stage.ids.forEach((expId, indexInStage) => {
          sequence.push({ id: expId, stage, stageIndex, indexInStage });
        });
      });
      const index = sequence.findIndex(step => step.id === id);
      if (index !== -1) return { path, sequence, index, current: sequence[index] };
    }
    return null;
  }

  function makePathLab(parent, id) {
    const target = byId[id];
    if (!target) return;
    const button = el("button", "path-lab", parent);
    button.type = "button";
    button.textContent = target.exp.title;
    button.setAttribute("aria-label", "開啟實驗：" + target.exp.title);
    button.addEventListener("click", () => location.hash = "#" + target.exp.id);
  }

  function renderLearningLadder() {
    const ladder = $("#learning-ladder");
    const tabs = $("#path-tabs");
    const timeline = $("#path-timeline");
    if (!ladder || !tabs || !timeline) return;
    if (!LEARNING_PATHS.length) { ladder.hidden = true; return; }

    const active = LEARNING_PATHS.find(path => path.id === activeLearningPath) || LEARNING_PATHS[0];
    activeLearningPath = active.id;
    ladder.hidden = false;
    tabs.innerHTML = "";
    timeline.innerHTML = "";

    LEARNING_PATHS.forEach(path => {
      const tab = el("button", "path-tab", tabs);
      tab.type = "button";
      tab.textContent = path.title;
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-selected", String(path.id === active.id));
      tab.classList.toggle("active", path.id === active.id);
      tab.addEventListener("click", () => {
        activeLearningPath = path.id;
        renderLearningLadder();
      });
    });

    active.stages.forEach((stage, index) => {
      const stageEl = el("article", "path-stage path-" + stage.kind, timeline);
      const stageTop = el("div", "path-stage-top", stageEl);
      const number = el("span", "path-stage-number", stageTop); number.textContent = String(index + 1).padStart(2, "0");
      const level = el("span", "path-stage-level", stageTop); level.textContent = stage.level;
      const note = el("p", "path-stage-note", stageEl); note.textContent = stage.note;
      const labs = el("div", "path-labs", stageEl);
      stage.ids.forEach(id => makePathLab(labs, id));
    });
  }

  function makeExperimentPathStep(parent, label, target, current) {
    const step = el(current ? "div" : "button", "exp-path-step" + (current ? " current" : ""), parent);
    if (!current) step.type = "button";
    const labelEl = el("span", "exp-path-label", step); labelEl.textContent = label;
    const titleEl = el("strong", "exp-path-title", step); titleEl.textContent = target.exp.title;
    if (!current) {
      step.setAttribute("aria-label", "前往" + label + "：" + target.exp.title);
      step.addEventListener("click", () => location.hash = "#" + target.exp.id);
    }
  }

  function renderExperimentLearningPath(id) {
    const root = $("#exp-learning-path");
    if (!root) return;
    const context = getPathContext(id);
    root.innerHTML = "";
    root.hidden = !context;
    if (!context) return;

    const heading = el("div", "exp-path-heading", root);
    const eyebrow = el("span", "exp-path-eyebrow", heading); eyebrow.textContent = "銜接路徑 · " + context.path.title;
    const summary = el("span", "exp-path-summary", heading);
    summary.textContent = context.current.stage.level + " · 第 " + (context.current.indexInStage + 1) + " 步";

    const steps = el("div", "exp-path-steps", root);
    const previous = context.sequence[context.index - 1];
    const next = context.sequence[context.index + 1];
    if (previous && byId[previous.id]) makeExperimentPathStep(steps, "前一步", byId[previous.id], false);
    makeExperimentPathStep(steps, "目前", byId[id], true);
    if (next && byId[next.id]) makeExperimentPathStep(steps, "下一步", byId[next.id], false);
  }

  function renderLearningOutput(f) {
    const root = $("#learning-output");
    if (!root) return;
    const { exp, mod } = f;
    const bridge = TEXTBOOK_BRIDGES[mod.id] || {
      junior: "國中自然：以生活現象建立直覺", senior: "高中物理：以模型、圖像與量測建立關係", next: "大學入門：以更一般的數學模型延伸", observe: "每次只改變一個條件，對照讀數、圖像與現象。", exam: "先把題目的情境翻成物理量與關係式，再選擇合適模型。"
    };
    root.innerHTML = "";

    const heading = el("div", "learning-output-heading", root);
    const eyebrow = el("span", "learning-output-eyebrow", heading); eyebrow.textContent = "學習閉環 · 本次實驗";
    const title = el("h3", "learning-output-title", heading); title.textContent = "玩完後，你要能帶走什麼？";
    const intro = el("p", "learning-output-intro", heading); intro.textContent = "不是只看到現象，而是把操作、課本概念與解題方法連成一條線。";

    const grid = el("div", "learning-output-grid", root);
    const observe = el("article", "learning-output-step observe", grid);
    const observeNo = el("span", "learning-output-no", observe); observeNo.textContent = "01 · 操作時先看";
    const observeCopy = el("p", "learning-output-copy", observe); observeCopy.textContent = bridge.observe;

    const textbook = el("article", "learning-output-step textbook", grid);
    const textbookNo = el("span", "learning-output-no", textbook); textbookNo.textContent = "02 · 課本接在哪裡";
    const textbookList = el("dl", "textbook-bridge", textbook);
    [["國中打底", bridge.junior], ["高中課本", bridge.senior], ["大學延伸", bridge.next]].forEach(([label, text]) => {
      const row = el("div", "textbook-bridge-row", textbookList);
      const term = el("dt", null, row); term.textContent = label;
      const desc = el("dd", null, row); desc.textContent = text;
    });

    const takeaway = el("article", "learning-output-step takeaway", grid);
    const takeawayNo = el("span", "learning-output-no", takeaway); takeawayNo.textContent = "03 · 玩完能帶走";
    const points = el("ul", "learning-takeaways", takeaway);
    exp.points.slice(0, 3).forEach(point => { const item = el("li", null, points); item.textContent = point; });

    const transfer = el("div", "learning-transfer", root);
    const transferLabel = el("span", "learning-transfer-label", transfer); transferLabel.textContent = "解題轉換";
    const transferCopy = el("p", "learning-transfer-copy", transfer); transferCopy.textContent = bridge.exam;

    const reflection = el("div", "learning-reflection", root);
    const reflectionHead = el("div", "learning-reflection-head", reflection);
    const label = el("label", "learning-reflection-label", reflectionHead); label.htmlFor = "learning-reflection-input"; label.textContent = "一句話結論";
    const prompt = el("p", "learning-reflection-prompt", reflectionHead);
    prompt.textContent = "改變一個參數後，請用「" + (exp.points[0] || exp.title) + "」解釋讀數或圖形為什麼改變。";
    const input = el("textarea", "learning-reflection-input", reflection); input.id = "learning-reflection-input"; input.maxLength = 240;
    input.placeholder = "寫下你的觀察與原因…";
    input.value = store.get("pl-reflection-" + exp.id, "");
    const actions = el("div", "learning-reflection-actions", reflection);
    const saved = el("span", "learning-reflection-saved", actions); saved.textContent = input.value ? "已儲存於這台裝置" : "";
    const save = el("button", "learning-reflection-save", actions); save.type = "button"; save.textContent = "儲存結論";
    save.addEventListener("click", () => {
      store.set("pl-reflection-" + exp.id, input.value.trim());
      saved.textContent = input.value.trim() ? "已儲存於這台裝置" : "已清除這則結論";
    });
  }

  function buildHome() {
    const heroExperimentCount = $("#hero-exp-count");
    if (heroExperimentCount) heroExperimentCount.textContent = C.totalExperiments;
    const grid = $("#module-grid");
    grid.innerHTML = "";
    C.modules.forEach(m => {
      const card = el("div", "mcard", grid);
      card.style.setProperty("--m-color", m.color);
      const top = el("div", "mcard-top", card);
      const no = el("div", "mcard-no", top); no.textContent = "模組 " + m.no;
      const tr = el("div", "mcard-track", top); tr.textContent = m.track;
      const ti = el("div", "mcard-title", card); ti.textContent = m.title;
      const intro = el("div", "mcard-intro", card); intro.textContent = m.intro;
      const meta = el("div", "mcard-meta", card);
      meta.innerHTML = '<b>' + m.experiments.length + '</b> 個實驗<span class="chip">全互動</span>';
      card.addEventListener("click", () => {
        const first = m.experiments[0];
        location.hash = "#" + first.id;
      });
    });
    renderLearningLadder();
    // 統計數字
    $("#stat-mod").textContent = C.totalModules;
    $("#stat-exp").textContent = C.totalExperiments;
    $("#stat-int").textContent = C.totalInteractive;
    $("#side-exp").textContent = C.totalExperiments;
    $("#side-int").textContent = C.totalInteractive;
  }

  /* ------------------------------- 實驗頁 ------------------------------- */
  function typeset(node) {
    if (window.MathJax && MathJax.typesetPromise) {
      MathJax.typesetPromise([node]).catch(() => {});
    }
  }

  function openExp(id) {
    const f = byId[id];
    if (!f) { location.hash = ""; return; }
    if (currentSim && currentSim.stop) { try { currentSim.stop(); } catch (e) {} }
    currentSim = null; currentId = id;
    const { exp, mod } = f;

    showView("exp");
    const view = $("#exp-view");
    view.style.setProperty("--m-color", mod.color);
    document.documentElement.style.setProperty("--m-color", mod.color); // 讓 canvas 也能取用模組色

    view.classList.remove("fade-in"); void view.offsetWidth; view.classList.add("fade-in");

    // 頁首
    $("#exp-crumb").innerHTML = '<b>模組' + mod.no + " · " + mod.title + '</b><span class="sep">/</span>' +
      "第 " + (f.indexInMod + 1) + " 個實驗";
    $("#exp-title").textContent = exp.title;
    $("#exp-lead").textContent = exp.concept;
    renderExperimentLearningPath(id);
    renderLearningOutput(f);

    // 模擬工作區
    const simRoot = $("#sim-root");
    simRoot.innerHTML = "";
    if (PL.has(exp.id)) {
      try {
        currentSim = PL.get(exp.id).build(simRoot) || {};
      } catch (err) {
        console.error("模擬載入失敗：" + exp.id, err);
        simRoot.innerHTML = '<div class="empty">此模擬載入時發生問題。</div>';
      }
    } else {
      simRoot.innerHTML = '<div class="empty">此實驗的互動模擬尚在開發中。</div>';
    }

    // 教材：公式與重點
    $("#guide-concept").textContent = exp.concept;
    $("#guide-formula").innerHTML = exp.formula;
    const ul = $("#guide-points"); ul.innerHTML = "";
    exp.points.forEach(p => { const li = el("li", null, ul); li.textContent = p; });
    typeset($("#guide-formula"));

    // 上一個 / 下一個
    const prev = FLAT[f.order - 1], next = FLAT[f.order + 1];
    setNav($("#nav-prev"), prev, "上一個實驗");
    setNav($("#nav-next"), next, "下一個實驗");

    // 進度與側邊高亮
    markViewed(id);
    highlightSidebar(id, mod.id);
    $(".main").scrollTop = 0; window.scrollTo(0, 0);
    document.title = exp.title + "｜物理實驗室";
  }

  function setNav(btn, target, dir) {
    if (!target) { btn.disabled = true; btn.onclick = null; btn.querySelector(".nav-title").textContent = "—"; btn.querySelector(".nav-dir").textContent = dir; return; }
    btn.disabled = false;
    btn.querySelector(".nav-dir").textContent = dir;
    btn.querySelector(".nav-title").textContent = target.exp.title;
    btn.onclick = () => location.hash = "#" + target.exp.id;
  }

  function highlightSidebar(id, modId) {
    document.querySelectorAll(".exp-item.active").forEach(x => x.classList.remove("active"));
    const item = document.querySelector('.exp-item[data-id="' + CSS.escape(id) + '"]');
    if (item) {
      item.classList.add("active");
      const mod = item.closest(".module");
      if (mod && !mod.classList.contains("open")) mod.classList.add("open");
      item.scrollIntoView({ block: "nearest" });
    }
    closeSidebarMobile();
  }

  /* ------------------------------- 進度 ------------------------------- */
  function markViewed(id) {
    if (!viewed.has(id)) { viewed.add(id); store.set("pl-progress", [...viewed]); }
    refreshViewedMarks();
  }
  function refreshViewedMarks() {
    document.querySelectorAll(".exp-item").forEach(it => {
      it.classList.toggle("viewed", viewed.has(it.dataset.id));
    });
    const pct = Math.round(viewed.size / C.totalExperiments * 100);
    const fill = $("#progress-fill"); if (fill) fill.style.width = pct + "%";
    const lab = $("#progress-count"); if (lab) lab.textContent = viewed.size + " / " + C.totalExperiments;
  }
  function resetProgress() {
    viewed = new Set(); store.set("pl-progress", []); refreshViewedMarks();
  }

  /* ------------------------------- 搜尋 ------------------------------- */
  function runSearch(q) {
    q = (q || "").trim().toLowerCase();
    if (!q) { if (location.hash.replace("#", "")) return; showView("home"); return; }
    const hits = FLAT.filter(f =>
      f.exp.title.toLowerCase().includes(q) ||
      f.exp.concept.toLowerCase().includes(q) ||
      f.mod.title.toLowerCase().includes(q) ||
      f.exp.points.some(p => p.toLowerCase().includes(q))
    );
    const list = $("#sr-list"); list.innerHTML = "";
    $("#sr-count").textContent = hits.length;
    if (!hits.length) { list.innerHTML = '<div class="empty">找不到符合「' + q + '」的實驗。</div>'; }
    hits.forEach(f => {
      const item = el("div", "sr-item", list);
      item.style.setProperty("--m-color", f.mod.color);
      item.innerHTML = '<div class="sr-mod">模組' + f.mod.no + " · " + f.mod.title + '</div>' +
        '<div class="sr-title">' + f.exp.title + '</div>' +
        '<div class="sr-desc">' + f.exp.concept + '</div>';
      item.addEventListener("click", () => location.hash = "#" + f.exp.id);
    });
    showView("search");
  }

  /* ------------------------------- 視圖切換 ------------------------------- */
  function showView(name) {
    $("#home-view").style.display = name === "home" ? "" : "none";
    $("#exp-view").style.display = name === "exp" ? "" : "none";
    $("#search-results").style.display = name === "search" ? "" : "none";
  }

  function closeSidebarMobile() { $("#sidebar").classList.remove("open"); $("#scrim").classList.remove("show"); }
  function toggleSidebar() { $("#sidebar").classList.toggle("open"); $("#scrim").classList.toggle("show"); }

  /* ------------------------------- 路由 ------------------------------- */
  function route() {
    const id = decodeURIComponent(location.hash.replace(/^#/, ""));
    if (!id || id === "home") { showView("home"); document.title = "物理實驗室｜台灣中學互動物理"; if (currentSim && currentSim.stop) currentSim.stop(); currentSim = null; return; }
    openExp(id);
  }

  function lockLab() {
    if (currentSim && currentSim.stop) { try { currentSim.stop(); } catch (e) {} }
    currentSim = null;
    document.body.classList.remove("has-access");
    document.body.classList.add("access-locked");
    $("#access-password").value = "";
    $("#access-error").textContent = "";
    setTimeout(() => $("#access-password").focus(), 0);
  }

  async function sha256(value) {
    if (!window.crypto || !window.crypto.subtle) return "";
    const bytes = new TextEncoder().encode(value);
    const digest = await window.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, "0")).join("");
  }

  function unlockLab() {
    document.body.classList.remove("access-locked");
    document.body.classList.add("has-access");
    if (!initialized) { initialized = true; init(); }
    else route();
  }

  function initAccessGate() {
    const form = $("#access-form");
    const input = $("#access-password");
    const error = $("#access-error");
    form.addEventListener("submit", async event => {
      event.preventDefault();
      const submit = form.querySelector("button[type=submit]");
      submit.disabled = true; error.textContent = "驗證中…";
      try {
        const digest = await sha256(input.value);
        if (digest && digest === ACCESS_HASH) { unlockLab(); return; }
        error.textContent = digest ? "密碼不正確，請再試一次。" : "此瀏覽器無法驗證密碼。";
        input.select();
      } catch (e) {
        error.textContent = "驗證暫時無法完成，請重新整理後再試。";
      } finally {
        submit.disabled = false;
      }
    });
    setTimeout(() => input.focus(), 0);
  }

  /* ------------------------------- 啟動 ------------------------------- */
  function init() {
    auditCurriculum();
    buildSidebar();
    buildHome();
    applyTheme(store.get("pl-theme", "dark"));

    $("#theme-toggle").addEventListener("click", () => {
      applyTheme(document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light");
    });
    $("#lock-session").addEventListener("click", lockLab);
    $("#menu-toggle").addEventListener("click", toggleSidebar);
    $("#scrim").addEventListener("click", closeSidebarMobile);
    $("#brand-home").addEventListener("click", () => location.hash = "");
    $("#hero-start").addEventListener("click", () => location.hash = "#" + FLAT[0].exp.id);
    $("#hero-browse").addEventListener("click", () => $("#module-grid").scrollIntoView({ behavior: "smooth" }));
    $("#btn-reset").addEventListener("click", resetProgress);

    const search = $("#search-input");
    search.addEventListener("input", () => runSearch(search.value));

    document.addEventListener("keydown", e => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "TEXTAREA") return;
      if (currentId && $("#exp-view").style.display !== "none") {
        const f = byId[currentId];
        if (e.key === "ArrowRight" && FLAT[f.order + 1]) { location.hash = "#" + FLAT[f.order + 1].exp.id; }
        if (e.key === "ArrowLeft" && FLAT[f.order - 1]) { location.hash = "#" + FLAT[f.order - 1].exp.id; }
      }
      if (e.key === "Escape") closeSidebarMobile();
    });

    window.addEventListener("hashchange", route);
    route();

    // 版本連線時間
    const clock = $("#clock");
    if (clock) {
      const tick = () => { const d = new Date(); clock.textContent = d.toLocaleTimeString("zh-TW", { hour12: false }); };
      tick(); setInterval(tick, 1000);
    }

    // PWA
    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
      window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initAccessGate);
  else initAccessGate();
})();
