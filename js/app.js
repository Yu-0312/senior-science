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
  // 離開模組時用三題收束概念；題目刻意著重判斷與模型，不要求背誦公式。
  const MODULE_CHECKPOINTS = {
    kinematics: [
      { prompt: "在速度－時間圖中，圖線的斜率代表哪一個物理量？", choices: ["位移", "加速度", "平均速率", "質量"], correct: 1, explanation: "速度改變得多快就是加速度，因此 v-t 圖的斜率是加速度；圖下方面積才對應位移。" },
      { prompt: "忽略空氣阻力時，不同質量的物體從同一高度同時自由落下，結果是？", choices: ["較重者先落地", "較輕者先落地", "同時落地", "要看物體體積"], correct: 2, explanation: "自由落體的加速度都是 g，質量會同時影響重力與慣性，所以不影響落下時間。" },
      { prompt: "平地拋體最適合拆成哪兩個彼此獨立的運動？", choices: ["水平方向等速、鉛直方向等加速度", "水平方向等加速、鉛直方向等速", "兩方向都等速", "兩方向都做圓周運動"], correct: 0, explanation: "忽略空氣阻力後，水平方向沒有合力，鉛直方向只受重力，兩方向可分開分析。" }
    ],
    newton: [
      { prompt: "物體靜止貼在粗糙牆面上時，牆面提供的靜摩擦力通常為何？", choices: ["永遠等於 μsN", "恰好平衡物體的重力，未必達最大值", "一定為零", "方向一定向下"], correct: 1, explanation: "靜摩擦力會在最大靜摩擦力範圍內自行調整；靜止時它常向上平衡重力。" },
      { prompt: "牛頓第二定律中的 F 指的是？", choices: ["單一最大的力", "物體受的合力", "重力", "摩擦力"], correct: 1, explanation: "F = ma 中的 F 是所有外力的向量和。畫受力圖後，才能正確列出各方向的合力。" },
      { prompt: "一對作用力與反作用力的正確敘述是？", choices: ["都作用在同一物體上", "大小相等、方向相反，作用在不同物體上", "會互相抵消所以不能讓物體運動", "只有靜止物體才有"], correct: 1, explanation: "作用力與反作用力分別作用在兩個物體上，因此不會在同一個受力圖中互相抵消。" }
    ],
    momentum: [
      { prompt: "碰撞過程若系統受到的外力衝量可忽略，哪一個量守恆？", choices: ["每個物體的動量", "系統總動量", "系統動能", "每個物體的速度"], correct: 1, explanation: "外力衝量可忽略時，系統總動量守恆；個別物體的動量與速度仍可能改變。" },
      { prompt: "力－時間圖下方的面積代表？", choices: ["功", "動量", "衝量", "功率"], correct: 2, explanation: "衝量 J = FΔt，也等於動量的改變量 Δp；在 F-t 圖上就是曲線下的面積。" },
      { prompt: "完全非彈性碰撞後，兩物體黏在一起。通常何者正確？", choices: ["總動量與總動能都守恆", "只有總動量守恆", "只有總動能守恆", "兩者都不守恆"], correct: 1, explanation: "黏在一起代表部分動能轉成內能、聲音或形變能，但若外力可忽略，總動量仍守恆。" }
    ],
    energy: [
      { prompt: "對一個物體所做的合功，等於哪一個量的改變？", choices: ["位能", "動能", "質量", "動量"], correct: 1, explanation: "功能定理指出 Wnet = ΔK；合力做的總功直接決定動能改變。" },
      { prompt: "有摩擦力時，機械能減少最常表示能量轉成？", choices: ["熱與內能", "質量", "電荷", "完全消失"], correct: 0, explanation: "能量不會消失，摩擦會把可見的機械能轉成內能、聲音等較難回收的形式。" },
      { prompt: "若只受保守力作用，物體從高處滑下時通常是？", choices: ["位能增加、動能減少", "位能減少、動能增加，總機械能不變", "總機械能一定增加", "速度保持不變"], correct: 1, explanation: "重力位能會轉成動能；只要沒有非保守力做功，兩者的總和維持不變。" }
    ],
    gravity: [
      { prompt: "「向心力」在圓周運動中最正確的意思是？", choices: ["一種額外的新力", "所有指向圓心的真實力合力", "永遠等於重力", "永遠與速度同方向"], correct: 1, explanation: "向心力不是新力的名稱，而是提供向心加速度的合力角色，例如張力、摩擦力或重力。" },
      { prompt: "衛星繞行地球時，主要提供向心力的是？", choices: ["引擎推力", "地球萬有引力", "離心力", "空氣阻力"], correct: 1, explanation: "衛星持續自由落向地球，萬有引力改變其速度方向，形成軌道。" },
      { prompt: "兩物體距離加倍時，萬有引力大小變成原本的？", choices: ["2 倍", "1/2", "1/4", "4 倍"], correct: 2, explanation: "萬有引力與距離平方成反比：F ∝ 1/r²，距離加倍會讓力降為四分之一。" }
    ],
    shm: [
      { prompt: "簡諧運動的平衡位置有什麼特徵？", choices: ["速度一定為零", "恢復力為零", "位能一定最大", "加速度一定最大"], correct: 1, explanation: "平衡位置是恢復力為零的位置；通過此處時速度通常最大。" },
      { prompt: "理想彈簧振子的週期 T = 2π√(m/k)，因此小振幅下週期不取決於？", choices: ["質量", "彈簧勁度", "振幅", "m 與 k 的比值"], correct: 2, explanation: "理想簡諧運動中，週期由質量與彈簧勁度決定，改變小振幅不改變週期。" },
      { prompt: "受迫振動最容易發生共振的條件是？", choices: ["驅動頻率接近系統固有頻率", "振幅為零", "完全沒有外力", "質量無限大"], correct: 0, explanation: "外力供能的節奏與系統固有頻率相近時，能量累積最有效，振幅會明顯放大。" }
    ],
    thermal: [
      { prompt: "兩個不同溫度的物體接觸後，熱量自發傳遞方向通常是？", choices: ["低溫到高溫", "高溫到低溫", "一定雙向相等", "與溫度無關"], correct: 1, explanation: "在沒有外加做功時，能量以熱的形式由高溫物體流向低溫物體，直到熱平衡。" },
      { prompt: "下列哪一項最能區分溫度與熱量？", choices: ["兩者都是能量單位", "溫度描述狀態，熱量是因溫差傳遞的能量", "熱量只存在於固體", "溫度越高質量一定越大"], correct: 1, explanation: "溫度是系統狀態的量；熱量是能量跨越系統邊界的傳遞方式。" },
      { prompt: "純物質在熔化或沸騰的過程中持續吸熱，溫度通常？", choices: ["持續上升", "持續下降", "大致維持不變", "一定變成零"], correct: 2, explanation: "相變期間吸收的能量主要用來改變分子間排列與位能，稱為潛熱。" }
    ],
    waves: [
      { prompt: "波速、頻率與波長的關係式是？", choices: ["v = fλ", "v = f/λ", "v = λ/f", "f = vλ"], correct: 0, explanation: "每秒通過 f 個波長，每個波長長度為 λ，因此波速 v = fλ。" },
      { prompt: "固定同一條繩子的張力與線密度，改變波源頻率時，最先固定不變的是？", choices: ["波速", "波長", "週期", "節點數"], correct: 0, explanation: "波速由介質性質決定；頻率變高時，波長會相應縮短以維持 v = fλ。" },
      { prompt: "兩個同相且振幅相近的波在同一位置相遇，最容易出現？", choices: ["建設性干涉，振幅增大", "完全消失", "波速停止", "頻率變成零"], correct: 0, explanation: "同相波峰遇波峰、波谷遇波谷，位移相加，形成建設性干涉。" }
    ],
    optics: [
      { prompt: "光從空氣斜射入玻璃時，折射光通常會？", choices: ["偏離法線", "靠近法線", "沿界面傳播", "停止傳播"], correct: 1, explanation: "進入折射率較大的介質時光速變小，依司乃耳定律折射角變小，因此靠近法線。" },
      { prompt: "雙狹縫干涉條紋間距 Δx 與下列何者成正比？", choices: ["狹縫間距 d", "螢幕距離 L", "狹縫數量", "光強度"], correct: 1, explanation: "Δx = λL/d；螢幕距離愈遠或波長愈長，條紋愈疏。" },
      { prompt: "凸透鏡把遠方物體成像在紙屏上時，所成的像通常是？", choices: ["正立虛像", "倒立實像", "沒有像", "只有彩色影子"], correct: 1, explanation: "能投影到紙屏上的必為實像；凸透鏡對焦遠物時形成倒立實像。" }
    ],
    electric: [
      { prompt: "在串聯電路中，各元件通過的電流大小通常？", choices: ["相同", "與電阻成正比", "都為零", "每個節點後必增加"], correct: 0, explanation: "串聯只有一條路徑，穩態下每秒通過各截面的電荷量相同，因此電流相同。" },
      { prompt: "歐姆定律適用的電阻元件，電壓與電流關係為？", choices: ["U = IR", "U = I/R", "U = R/I", "U 與 I 無關"], correct: 0, explanation: "在溫度等條件近似固定時，電壓 U 與電流 I 成正比，比例常數是電阻 R。" },
      { prompt: "將電壓表正確接入電路時，通常應該？", choices: ["與待測元件串聯", "與待測元件並聯", "直接短接電源兩端", "放在任意位置都相同"], correct: 1, explanation: "電壓表量兩端的電位差，內電阻很大，因此應並聯在待測元件兩端。" }
    ],
    magnetism: [
      { prompt: "導體中產生感應電動勢的必要條件是？", choices: ["磁通量改變", "磁場完全靜止且沒有相對運動", "電阻為零", "導體沒有閉合迴路"], correct: 0, explanation: "法拉第定律指出感應電動勢來自磁通量的改變；閉合迴路才會形成可量到的感應電流。" },
      { prompt: "楞次定律所描述的感應電流方向是？", choices: ["永遠增強原磁通量變化", "阻礙磁通量的改變", "與磁場方向無關", "永遠順時針"], correct: 1, explanation: "感應效應會反抗造成它的磁通量變化，這反映能量守恆。" },
      { prompt: "載流直導線在均勻磁場中受力大小 F = BIL sinθ，何時最大？", choices: ["導線與磁場平行", "導線與磁場垂直", "電流為零", "磁場為零"], correct: 1, explanation: "sin 90° = 1，所以電流方向與磁場垂直時，安培力最大。" }
    ],
    modern: [
      { prompt: "光電效應中，即使增強光強度，仍無法打出電子的情況是？", choices: ["頻率低於臨界頻率", "頻率高於臨界頻率", "金屬表面平滑", "電子數量太多"], correct: 0, explanation: "單一光子的能量 E = hf；頻率低於臨界值時，每個光子能量都不足以克服逸出功。" },
      { prompt: "原子光譜呈現離散譜線，最直接反映什麼概念？", choices: ["能階量子化", "所有能量連續", "光速會隨顏色大幅不同", "電子完全靜止"], correct: 0, explanation: "電子只能在特定能階間躍遷，吸收或放出的光子能量因此呈現離散值。" },
      { prompt: "放射性衰變的正確敘述是？", choices: ["每一顆原子在固定時刻衰變", "單次衰變可精準預測", "大量原子遵循可預測的半衰期統計規律", "半衰期會因樣品量加倍而加倍"], correct: 2, explanation: "個別原子何時衰變具有隨機性，但大量原子整體會呈現穩定的指數衰減與半衰期。" }
    ]
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

  function auditCheckpointBank() {
    const moduleIds = C.modules.map(module => module.id);
    const missingModules = moduleIds.filter(id => !Array.isArray(MODULE_CHECKPOINTS[id]) || MODULE_CHECKPOINTS[id].length !== 3);
    const invalidQuestions = moduleIds.flatMap(id => (MODULE_CHECKPOINTS[id] || []).filter(question =>
      !question.prompt || !Array.isArray(question.choices) || question.choices.length !== 4 || question.correct < 0 || question.correct >= question.choices.length || !question.explanation
    ).map(question => ({ moduleId: id, prompt: question.prompt || "" })));
    const audit = {
      modules: moduleIds.length,
      questions: moduleIds.reduce((total, id) => total + (MODULE_CHECKPOINTS[id] || []).length, 0),
      missingModules,
      invalidQuestions
    };
    window.PhysicsLabCheckpointAudit = audit;
    if (missingModules.length || invalidQuestions.length) console.error("章節檢核題庫稽核失敗", audit);
    return audit;
  }

  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  let viewed = new Set(store.get("pl-progress", []));
  let currentSim = null;
  let currentId = null;
  let checkpointState = null;
  let pendingChapterTarget = null;
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

  /* ------------------------------- 章節檢核 ------------------------------- */
  function showChapterCheckpoint(mod, nextMod) {
    const questions = MODULE_CHECKPOINTS[mod.id];
    if (!questions || !questions.length) { openExp(pendingChapterTarget); return; }
    checkpointState = { mod, nextMod, questions, index: 0, answers: [], completed: false };
    const root = $("#chapter-checkpoint");
    root.style.setProperty("--checkpoint-color", mod.color);
    root.hidden = false;
    document.body.classList.add("checkpoint-active");
    renderCheckpoint();
    setTimeout(() => $("#checkpoint-panel").focus(), 0);
  }

  function renderCheckpoint() {
    const state = checkpointState;
    const root = $("#checkpoint-content");
    if (!state || !root) return;
    root.innerHTML = "";

    const kicker = el("p", "checkpoint-kicker", root);
    kicker.textContent = "離開前整理 · 模組 " + state.mod.no;
    const title = el("h2", "checkpoint-title", root); title.id = "checkpoint-title";
    title.textContent = state.mod.title + "章節檢核";

    if (state.completed) {
      renderCheckpointResult(root, state);
      return;
    }

    const intro = el("p", "checkpoint-intro", root);
    intro.textContent = "切換到「" + state.nextMod.title + "」前，用 3 題關鍵概念確認這一章已經能帶著走。";
    const progress = el("div", "checkpoint-progress", root);
    const progressLabel = el("span", null, progress); progressLabel.textContent = "第 " + (state.index + 1) + " / " + state.questions.length + " 題";
    const progressBar = el("div", "checkpoint-progress-bar", progress);
    const progressFill = el("div", "checkpoint-progress-fill", progressBar);
    progressFill.style.width = ((state.index + 1) / state.questions.length * 100) + "%";

    const question = state.questions[state.index];
    const questionTitle = el("h3", "checkpoint-question", root); questionTitle.textContent = question.prompt;
    const choices = el("div", "checkpoint-choices", root);
    const selected = state.answers[state.index];
    question.choices.forEach((choice, choiceIndex) => {
      const button = el("button", "checkpoint-choice", choices); button.type = "button";
      button.disabled = selected !== undefined;
      if (selected !== undefined) {
        if (choiceIndex === question.correct) button.classList.add("correct");
        else if (choiceIndex === selected) button.classList.add("incorrect");
      }
      const index = el("span", "checkpoint-choice-index", button); index.textContent = String.fromCharCode(65 + choiceIndex);
      const label = el("span", "checkpoint-choice-label", button); label.textContent = choice;
      button.addEventListener("click", () => {
        if (checkpointState.answers[checkpointState.index] !== undefined) return;
        checkpointState.answers[checkpointState.index] = choiceIndex;
        renderCheckpoint();
      });
    });

    if (selected !== undefined) {
      const feedback = el("p", "checkpoint-feedback", root);
      const correct = selected === question.correct;
      feedback.innerHTML = "<strong>" + (correct ? "答對了。" : "先別急，這題的關鍵是：") + "</strong>" + question.explanation;
    }

    const actions = el("div", "checkpoint-actions", root);
    const skip = el("button", "checkpoint-skip", actions); skip.type = "button"; skip.textContent = "略過檢核，繼續";
    skip.addEventListener("click", () => leaveCheckpoint());
    if (selected !== undefined) {
      const next = el("button", "checkpoint-next", actions); next.type = "button";
      next.textContent = state.index === state.questions.length - 1 ? "查看結果" : "下一題";
      next.addEventListener("click", () => {
        if (checkpointState.index < checkpointState.questions.length - 1) {
          checkpointState.index += 1;
        } else {
          checkpointState.completed = true;
          const score = checkpointState.answers.reduce((total, answer, index) => total + (answer === checkpointState.questions[index].correct ? 1 : 0), 0);
          store.set("pl-checkpoint-" + checkpointState.mod.id, { score, total: checkpointState.questions.length, completedAt: new Date().toISOString() });
        }
        renderCheckpoint();
      });
    }
  }

  function renderCheckpointResult(root, state) {
    const score = state.answers.reduce((total, answer, index) => total + (answer === state.questions[index].correct ? 1 : 0), 0);
    const result = el("div", "checkpoint-result-score", root); result.textContent = score;
    const total = el("span", null, result); total.textContent = " / " + state.questions.length;
    const note = el("p", "checkpoint-result-note", root);
    note.textContent = score === state.questions.length
      ? "三個關鍵判斷都掌握了。帶著這組概念進入下一章吧。"
      : "已記錄本次結果。下面的題目可作為回到這一章時優先複習的起點。";
    const review = el("div", "checkpoint-review", root);
    state.questions.forEach((question, index) => {
      const item = el("div", "checkpoint-review-item", review);
      const correct = state.answers[index] === question.correct;
      item.classList.add(correct ? "correct" : "incorrect");
      item.textContent = (correct ? "已掌握 · " : "待複習 · ") + question.explanation;
    });
    const actions = el("div", "checkpoint-actions", root);
    const next = el("button", "checkpoint-next", actions); next.type = "button";
    next.textContent = "進入「" + state.nextMod.title + "」";
    next.addEventListener("click", () => leaveCheckpoint());
  }

  function leaveCheckpoint() {
    const target = pendingChapterTarget;
    checkpointState = null;
    pendingChapterTarget = null;
    const root = $("#chapter-checkpoint");
    root.hidden = true;
    document.body.classList.remove("checkpoint-active");
    if (target && byId[target]) openExp(target);
  }

  /* ------------------------------- 路由 ------------------------------- */
  function route() {
    const id = decodeURIComponent(location.hash.replace(/^#/, ""));
    if (!id || id === "home") { showView("home"); document.title = "物理實驗室｜台灣中學互動物理"; if (currentSim && currentSim.stop) currentSim.stop(); currentSim = null; currentId = null; return; }
    const target = byId[id];
    const current = currentId ? byId[currentId] : null;
    if (target && current && target.mod.id !== current.mod.id) {
      pendingChapterTarget = id;
      if (checkpointState && checkpointState.mod.id === current.mod.id) {
        checkpointState.nextMod = target.mod;
        renderCheckpoint();
      } else {
        showChapterCheckpoint(current.mod, target.mod);
      }
      return;
    }
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
    auditCheckpointBank();
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
      if (checkpointState) {
        if (e.key === "Escape") leaveCheckpoint();
        return;
      }
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
