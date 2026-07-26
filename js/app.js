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
    /*
     * 實驗程式改成延遲載入後，啟動當下註冊表是空的，不能再用它稽核。
     * 改成比對「對應表」——它由建置腳本實際執行每個實驗檔產生，
     * 能確保每個課程項目都真的有程式可以載入。
     */
    const mapped = Object.keys(EXPERIMENT_FILES);
    const available = new Set(mapped.concat(PL.ids ? PL.ids() : []));
    const expected = new Set(ids);
    const missingSimulations = ids.filter(id => !available.has(id));
    const extraSimulations = mapped.filter(id => !expected.has(id));
    const registeredIds = mapped;
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
  const STUDY_PLAN_KEY = "pl-study-plan";

  let viewed = new Set(store.get("pl-progress", []));
  let currentSim = null;
  let currentId = null;
  let checkpointState = null;
  let openToken = 0;      // 延遲載入時用來辨識「這次開啟是否仍然有效」
  let pendingChapterTarget = null;
  let initialized = false;

  function todayKey(date) {
    const d = date ? new Date(date) : new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function dayDiff(start, end) {
    const a = new Date(start + "T00:00:00");
    const b = new Date((end || todayKey()) + "T00:00:00");
    return Math.floor((b - a) / 86400000);
  }
  /* 站台設定（js/site-config.js）。合作結束後把 accessGate 改成 false 就全站公開。 */
  const SITE = window.PhysicsLabSite || {};
  const ACCESS_HASH = SITE.accessHash || "";
  const ACCESS_GATE_ENABLED = SITE.accessGate !== false;

  /* ---------------------------------------------------------------------
     實驗程式的延遲載入

     原本 16 個實驗檔（共 485 KB）在首頁就全部同步載入，但學生一次只會打開
     一個實驗，其餘 244 個的程式碼完全用不到。在中階手機上，這些解析與執行
     全部發生在畫面出現之前，是直接感受得到的卡頓。

     改成開啟實驗時才載入對應的檔案。對應表由 tools/build-manifest.js 產生，
     它是「真的把每個檔案跑一次」得到的，不受註冊寫法影響。
     --------------------------------------------------------------------- */
  const EXPERIMENT_FILES = window.PhysicsLabExperimentFiles || {};
  const loadedFiles = new Map();

  function loadScript(src) {
    if (loadedFiles.has(src)) return loadedFiles.get(src);
    const promise = new Promise((resolve, reject) => {
      const tag = document.createElement("script");
      tag.src = src;
      tag.async = false;              // 保持執行順序，避免相依性問題
      tag.onload = () => resolve(src);
      tag.onerror = () => reject(new Error("載入失敗：" + src));
      document.head.appendChild(tag);
    });
    loadedFiles.set(src, promise);
    return promise;
  }

  /* 確保某個實驗的程式碼已經就緒 */
  function ensureExperiment(id) {
    if (PL.has(id)) return Promise.resolve(true);
    const file = EXPERIMENT_FILES[id];
    if (!file) return Promise.resolve(false);
    const build = (window.PhysicsLabSite && window.PhysicsLabSite.build) || "";
    return loadScript("js/experiments/" + file + (build ? "?v=" + build : ""))
      .then(() => PL.has(id))
      .catch(err => { console.error(err); return false; });
  }

  /*
   * 預先載入相鄰實驗
   * 使用者按「下一個實驗」的機率很高，在瀏覽器閒置時先把相鄰的檔案抓下來，
   * 切換時就不會有等待。用 requestIdleCallback 確保不跟當前的操作搶資源。
   */
  function prefetchNeighbours(order) {
    // 使用者開了省流量模式，或處於 2G／慢速連線時，不要偷偷多抓檔案
    const net = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (net && (net.saveData || /2g/.test(net.effectiveType || ""))) return;
    const idle = window.requestIdleCallback || (fn => setTimeout(fn, 1200));
    const build = (window.PhysicsLabSite && window.PhysicsLabSite.build) || "";
    idle(() => {
      [order - 1, order + 1].forEach(i => {
        const item = FLAT[i];
        if (!item || PL.has(item.exp.id)) return;
        const file = EXPERIMENT_FILES[item.exp.id];
        if (file) loadScript("js/experiments/" + file + (build ? "?v=" + build : "")).catch(() => {});
      });
    });
  }

  /* ------------------------------- 主題 ------------------------------- */
  // 第一次造訪時沿用系統偏好，之後才以使用者的選擇為準。
  function preferredTheme() {
    const saved = store.get("pl-theme", null);
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }

  function applyTheme(t) {
    const theme = t === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", theme);
    store.set("pl-theme", theme);
    const btn = $("#theme-toggle");
    if (btn) {
      btn.innerHTML = theme === "light" ? moonIcon + "<span>深色</span>" : sunIcon + "<span>淺色</span>";
      btn.setAttribute("aria-pressed", String(theme === "light"));
      btn.title = theme === "light" ? "切換為深色主題" : "切換為淺色主題";
    }
    // 行動裝置的網址列顏色也要跟著換，否則淺色頁面上方會頂著一條深色。
    document.querySelectorAll('meta[name="theme-color"]').forEach(meta => meta.remove());
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = theme === "light" ? "#eef2f8" : "#080b11";
    document.head.appendChild(meta);
    // 主題切換後重繪目前模擬
    if (currentSim && currentSim.rerender) {
      try { currentSim.rerender(); } catch (e) { console.warn("主題切換重繪失敗", e); }
    }
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
  const pendingTypeset = new Set();

  function typeset(node) {
    if (!node) return;
    if (window.MathJax && MathJax.typesetPromise) {
      MathJax.typesetPromise([node]).catch(() => {});
    } else {
      pendingTypeset.add(node);
    }
  }

  window.addEventListener("mathjax-ready", () => {
    if (!window.MathJax || !MathJax.typesetPromise || !pendingTypeset.size) return;
    const nodes = [...pendingTypeset];
    pendingTypeset.clear();
    MathJax.typesetPromise(nodes).catch(() => {});
  });

  function compactText(text, fallback, limit) {
    const raw = String(text || fallback || "").replace(/<[^>]*>/g, "").replace(/\\[()[\]]/g, "").replace(/\s+/g, " ").trim();
    return raw.length > limit ? raw.slice(0, limit - 1) + "…" : raw;
  }

  function getPracticeDone() {
    return new Set(store.get("pl-practice-done", []));
  }

  function setPracticeDone(id, done) {
    const state = getPracticeDone();
    if (done) state.add(id); else state.delete(id);
    store.set("pl-practice-done", [...state]);
  }

  function getPracticeAnswers() {
    const state = store.get("pl-practice-answers", {});
    return state && typeof state === "object" && !Array.isArray(state) ? state : {};
  }

  function setPracticeAnswer(id, answer) {
    const state = getPracticeAnswers();
    state[id] = answer;
    store.set("pl-practice-answers", state);
  }

  function makeChoices(correctOption, distractors, seed) {
    const options = distractors.slice(0, 3);
    const correct = Math.abs(seed || 0) % (options.length + 1);
    options.splice(correct, 0, correctOption);
    return { options, correct };
  }

  /*
   * 誘答選項的來源
   * 樣板題原本的誘答是「只需背下名詞」這類明顯錯誤的敘述，用刪去法就能全對。
   * 改成從「同模組其他實驗的學習重點」取材：每個選項都是真的物理敘述，
   * 只是描述的不是這一個實驗，學生必須真的分辨概念才選得出來。
   */
  function neighbourDistractors(f, count) {
    const siblings = f.mod.experiments.filter(e => e.id !== f.exp.id && Array.isArray(e.points) && e.points.length);
    const picked = [];
    // 以 order 當起點等距取樣，讓同一個實驗每次進來的誘答固定，方便師生討論。
    for (let i = 0; i < siblings.length && picked.length < count; i += 1) {
      const item = siblings[(f.order * 3 + i * 5) % siblings.length];
      const text = compactText(item.points[(f.order + i) % item.points.length], item.title, 72);
      if (text && !picked.includes(text)) picked.push(text);
    }
    while (picked.length < count) picked.push("這個現象與實驗中量測的物理量沒有直接關係。");
    return picked;
  }

  function buildPracticeQuestions(f) {
    const { exp, mod } = f;
    // 有逐題撰寫的題目就優先使用；其餘實驗仍由樣板生成。
    const authored = window.PhysicsLabQuestionBank && window.PhysicsLabQuestionBank[exp.id];
    if (Array.isArray(authored) && authored.length) return authored;

    const points = Array.isArray(exp.points) && exp.points.length ? exp.points : [exp.concept || exp.title];
    const core = compactText(points[0], exp.title, 72);
    const support = compactText(points[1] || exp.concept, exp.title, 72);
    const bridge = TEXTBOOK_BRIDGES[mod.id] || {};
    const conceptChoices = makeChoices(core, neighbourDistractors(f, 3), f.order);
    const formulaChoices = makeChoices(
      "先列出已知量與目標量，確認單位後再依關係式推論。",
      [
        "選看起來最長的公式，直接代入所有數字。",
        "不必確認條件是否固定，先猜測答案再回填。",
        "只比較符號外觀，不需要判斷量之間的關係。"
      ],
      f.order + 1
    );
    const experimentChoices = makeChoices(
      "設定 A、B 兩組並只改變一個參數，再比較讀數或圖形。",
      [
        "同時改變多個參數，讓差異看起來更明顯。",
        "只記錄最後一次讀數，省略對照組。",
        "看到結果後才決定要記錄哪些數據。"
      ],
      f.order + 2
    );
    return [
      {
        type: "單選題 · 核心觀念",
        prompt: "下列何者最能說明「" + exp.title + "」的核心觀念？",
        options: conceptChoices.options,
        correct: conceptChoices.correct,
        hint: "操作模擬時一次只動一個滑桿，先看讀數，再看圖形的斜率、面積或峰值是否同步改變。",
        answer: "重點是把參數變化連回核心概念：" + core + "。若觀察結果不同，通常代表還有另一個條件沒有固定。"
      },
      {
        type: "單選題 · 解題步驟",
        prompt: "下列哪個解題流程最合理？",
        formula: exp.formula,
        formulaBeforePrompt: "面對下列公式：",
        options: formulaChoices.options,
        correct: formulaChoices.correct,
        hint: "先圈出公式中的每個符號，確認單位一致，再決定要代入、比例比較，還是看圖讀值。",
        answer: "可先列出已知量與目標量，再固定其他量做比例推論；本題可連到：" + support + "。"
      },
      {
        type: "單選題 · 實驗設計",
        prompt: "若要用模擬檢驗「" + (bridge.exam || "先選模型再代入條件") + "」，下列哪種操作最可靠？",
        options: experimentChoices.options,
        correct: experimentChoices.correct,
        hint: "建議用 A/B 對照：A 組維持預設，B 組只改一個參數；最後比較兩組讀數或圖形形狀。",
        answer: "理想答案要包含三件事：改了哪個量、讀數如何變、這個變化如何支持本實驗的模型。"
      }
    ];
  }

  /*
   * 隨機化計算題
   * 每個學生、每一天拿到的數值都不同，必須真的算出一個數字並輸入。
   * 種子由「實驗 id + 使用者裝置代號 + 日期」決定：同一天重新整理是同一題
   * （不會因為想換簡單的題目就一直重整），隔天或換人才會換題。
   */
  function deviceSeed() {
    let seed = store.get("pl-seed", null);
    if (typeof seed !== "number") {
      seed = Math.floor(Math.random() * 2147483647);
      store.set("pl-seed", seed);
    }
    return seed;
  }

  function questionSeed(expId) {
    const base = deviceSeed() + todayKey().replace(/-/g, "");
    let hash = 2166136261;
    const text = expId + "|" + base;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function renderNumericQuestion(root, f, index) {
    if (typeof window.PhysicsLabBuildNumericQuestion !== "function") return false;
    const q = window.PhysicsLabBuildNumericQuestion(f.exp.id, questionSeed(f.exp.id));
    if (!q) return false;

    const id = f.exp.id + "-num";
    const done = getPracticeDone();
    const solved = done.has(id);

    const item = el("article", "practice-item practice-numeric", root);
    const head = el("div", "practice-head", item);
    const type = el("span", "practice-type", head);
    type.textContent = "Q" + (index + 1) + " · " + q.type;
    const status = el("span", "practice-status", head);
    status.textContent = solved ? "答對" : "待作答";

    const prompt = el("p", "practice-question", item);
    prompt.textContent = q.prompt;

    const row = el("div", "numeric-row", item);
    const input = el("input", "numeric-input", row);
    input.type = "text";
    input.inputMode = "decimal";
    input.autocomplete = "off";
    input.placeholder = "輸入你算出的數值";
    input.setAttribute("aria-label", "作答欄位");
    if (q.unit) { const unit = el("span", "numeric-unit", row); unit.textContent = q.unit; }
    const submit = el("button", "numeric-submit", row);
    submit.type = "button"; submit.textContent = "檢查答案";

    const feedback = el("p", "practice-feedback" + (solved ? " is-correct" : ""), item);
    feedback.hidden = !solved;
    if (solved) feedback.textContent = "答對了。正確答案 " + PL.fmt(q.answer, 3) + (q.unit ? " " + q.unit : "");

    const actions = el("div", "practice-actions", item);
    const hintBtn = el("button", "practice-btn", actions);
    hintBtn.type = "button"; hintBtn.textContent = "看提示"; hintBtn.setAttribute("aria-expanded", "false");
    const stepBtn = el("button", "practice-btn", actions);
    stepBtn.type = "button"; stepBtn.textContent = "看逐步解法"; stepBtn.setAttribute("aria-expanded", "false");
    const newBtn = el("button", "practice-btn", actions);
    newBtn.type = "button"; newBtn.textContent = "換一題";

    const hint = el("div", "practice-detail", item); hint.hidden = true; hint.textContent = q.hint || "";
    const steps = el("ol", "practice-detail numeric-steps", item); steps.hidden = true;
    (q.steps || []).forEach(line => { const li = el("li", null, steps); li.textContent = line; });

    const toggle = (btn, panel) => btn.addEventListener("click", () => {
      panel.hidden = !panel.hidden;
      btn.setAttribute("aria-expanded", String(!panel.hidden));
    });
    toggle(hintBtn, hint);
    toggle(stepBtn, steps);

    newBtn.addEventListener("click", () => {
      // 換一題＝換種子；已作答狀態一併清掉
      store.set("pl-seed", Math.floor(Math.random() * 2147483647));
      setPracticeDone(id, false);
      renderPractice(f);
    });

    function grade() {
      const raw = input.value.trim().replace(/[，,\s]/g, "");
      const value = Number(raw);
      feedback.hidden = false;
      if (!raw || !isFinite(value)) {
        feedback.classList.remove("is-correct");
        feedback.textContent = "請先輸入一個數值。";
        return;
      }
      // 用相對容差，避免學生因為四捨五入位數不同被判錯
      const tol = q.tolerance || 0.03;
      const ok = Math.abs(value - q.answer) <= Math.abs(q.answer) * tol + 1e-9;
      feedback.classList.toggle("is-correct", ok);
      if (ok) {
        feedback.textContent = "答對了。正確答案 " + PL.fmt(q.answer, 3) + (q.unit ? " " + q.unit : "") +
          "（容差 ±" + (tol * 100).toFixed(0) + "%）";
        status.textContent = "答對";
        setPracticeDone(id, true);
        steps.hidden = false;
        stepBtn.setAttribute("aria-expanded", "true");
      } else {
        const off = ((value - q.answer) / q.answer) * 100;
        feedback.textContent = "還不對。你的答案比正確值" + (off > 0 ? "大" : "小") +
          " " + Math.abs(off).toFixed(0) + "%，先檢查單位換算與公式的移項方向。";
        status.textContent = "再試一次";
      }
    }

    submit.addEventListener("click", grade);
    input.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); grade(); } });
    return true;
  }

  function renderPractice(f) {
    const root = $("#practice-list");
    if (!root) return;
    const done = getPracticeDone();
    const answers = getPracticeAnswers();
    root.innerHTML = "";
    const questions = buildPracticeQuestions(f);
    questions.forEach((q, index) => {
      const id = f.exp.id + "-q" + index;
      const item = el("article", "practice-item", root);
      const head = el("div", "practice-head", item);
      const type = el("span", "practice-type", head); type.textContent = "Q" + (index + 1) + " · " + q.type;
      const savedAnswer = Number(answers[id]);
      const solved = savedAnswer === q.correct || done.has(id);
      const selectedAnswer = savedAnswer === q.correct ? savedAnswer : (solved ? q.correct : null);
      const status = el("span", "practice-status", head); status.textContent = solved ? "答對" : "待作答";
      const prompt = el("p", "practice-question", item);
      const appendFormula = () => {
        const formula = el("span", "practice-formula", prompt); formula.innerHTML = q.formula;
      };
      if (q.formula && q.formulaBeforePrompt) {
        prompt.append(document.createTextNode(q.formulaBeforePrompt));
        appendFormula();
        prompt.append(document.createTextNode(q.prompt));
      } else {
        prompt.append(document.createTextNode(q.prompt));
        if (q.formula) appendFormula();
      }
      const choices = el("div", "practice-options", item);
      choices.setAttribute("role", "radiogroup");
      choices.setAttribute("aria-label", "第 " + (index + 1) + " 題選項");
      const optionButtons = [];
      q.options.forEach((choice, choiceIndex) => {
        const option = el("button", "practice-option", choices); option.type = "button";
        option.setAttribute("role", "radio");
        option.setAttribute("aria-checked", String(selectedAnswer === choiceIndex));
        option.setAttribute("aria-label", String.fromCharCode(65 + choiceIndex) + "：" + choice);
        if (solved) {
          option.disabled = true;
          if (choiceIndex === q.correct) option.classList.add("is-correct");
        }
        const label = el("span", "practice-option-key", option); label.textContent = String.fromCharCode(65 + choiceIndex);
        const text = el("span", "practice-option-text", option); text.textContent = choice;
        optionButtons.push(option);
      });
      const feedback = el("p", "practice-feedback" + (solved ? " is-correct" : ""), item);
      feedback.setAttribute("aria-live", "polite");
      feedback.hidden = !solved;
      if (solved) feedback.textContent = "答對了，這個判斷可以帶進下一題。";
      const actions = el("div", "practice-actions", item);
      const hintBtn = el("button", "practice-btn", actions); hintBtn.type = "button"; hintBtn.textContent = "看提示"; hintBtn.setAttribute("aria-expanded", "false");
      const answerBtn = el("button", "practice-btn", actions); answerBtn.type = "button"; answerBtn.textContent = "看解析"; answerBtn.setAttribute("aria-expanded", "false");
      const hint = el("div", "practice-detail", item); hint.hidden = true;
      const hintLabel = el("strong", null, hint); hintLabel.textContent = "提示：";
      hint.append(document.createTextNode(q.hint));
      const answer = el("div", "practice-detail", item); answer.hidden = true;
      const answerLabel = el("strong", null, answer); answerLabel.textContent = "解析：";
      answer.append(document.createTextNode(q.answer));
      hintBtn.addEventListener("click", () => {
        hint.hidden = !hint.hidden;
        hintBtn.setAttribute("aria-expanded", String(!hint.hidden));
      });
      answerBtn.addEventListener("click", () => {
        answer.hidden = !answer.hidden;
        answerBtn.setAttribute("aria-expanded", String(!answer.hidden));
      });
      optionButtons.forEach((option, choiceIndex) => option.addEventListener("click", () => {
        if (solved) return;
        optionButtons.forEach(button => {
          button.classList.remove("is-incorrect");
          button.setAttribute("aria-checked", "false");
        });
        option.setAttribute("aria-checked", "true");
        feedback.hidden = false;
        if (choiceIndex !== q.correct) {
          option.classList.add("is-incorrect");
          feedback.classList.remove("is-correct");
          feedback.textContent = "再想想：" + q.hint;
          return;
        }
        optionButtons.forEach(button => { button.disabled = true; });
        option.classList.add("is-correct");
        feedback.classList.remove("is-incorrect");
        feedback.classList.add("is-correct");
        feedback.textContent = "答對了，這個判斷可以帶進下一題。";
        status.textContent = "答對";
        answer.hidden = false;
        answerBtn.setAttribute("aria-expanded", "true");
        setPracticeAnswer(id, choiceIndex);
        setPracticeDone(id, true);
      }));
    });
    // 有隨機計算題的實驗，把它接在選擇題後面當作最後一題
    renderNumericQuestion(root, f, questions.length);
    typeset(root);
  }

  /* ------------------------------- 學習存檔與計劃 ------------------------------- */
  function showSaveStatus(message, tone) {
    const status = $("#save-status");
    if (!status) return;
    status.textContent = message;
    status.classList.remove("ok", "warn");
    if (tone) status.classList.add(tone);
  }

  function collectLearningSave() {
    const data = {};
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith("pl-")) data[key] = localStorage.getItem(key);
    }
    return {
      app: "senior-science",
      version: 1,
      exportedAt: new Date().toISOString(),
      totalExperiments: C.totalExperiments,
      data
    };
  }

  function exportLearningSave() {
    const save = collectLearningSave();
    const blob = new Blob([JSON.stringify(save, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "senior-science-save-" + todayKey() + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showSaveStatus("已匯出學習存檔", "ok");
  }

  function importLearningSave(file) {
    if (!file) return;
    // 8 MB 以上不可能是這個網站的存檔，先擋掉避免瀏覽器卡死。
    if (file.size > 8 * 1024 * 1024) { showSaveStatus("檔案過大，請確認是本站存檔", "warn"); return; }
    const reader = new FileReader();
    reader.onerror = () => showSaveStatus("讀取檔案失敗", "warn");
    reader.onload = () => {
      let entries;
      try {
        const save = JSON.parse(String(reader.result || ""));
        if (!save || save.app !== "senior-science" || !save.data || typeof save.data !== "object") {
          showSaveStatus("存檔格式不正確", "warn");
          return;
        }
        // 先把資料驗完、整理好，再動現有進度。
        // 原本是「先清空全部 pl- 鍵，再寫入」，中途若失敗就等於把使用者的進度洗掉了。
        entries = Object.entries(save.data).filter(([key, value]) => key.startsWith("pl-") && typeof value === "string");
        if (!entries.length) { showSaveStatus("存檔內沒有可用的學習資料", "warn"); return; }
      } catch (e) {
        showSaveStatus("存檔不是有效的 JSON", "warn");
        return;
      }

      // 保留一份現況，寫入失敗就回復。
      const backup = {};
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key && key.startsWith("pl-")) backup[key] = localStorage.getItem(key);
      }
      try {
        Object.keys(backup).forEach(key => localStorage.removeItem(key));
        entries.forEach(([key, value]) => localStorage.setItem(key, value));
      } catch (e) {
        Object.keys(backup).forEach(key => localStorage.removeItem(key));
        Object.entries(backup).forEach(([key, value]) => localStorage.setItem(key, value));
        showSaveStatus("寫入失敗，已回復原本進度", "warn");
        return;
      }

      viewed = new Set(store.get("pl-progress", []));
      applyTheme(preferredTheme());
      // 側邊目錄的完成標記與展開狀態也要一起重畫，否則畫面與存檔不一致。
      refreshViewedMarks();
      renderStudyCenter();
      syncPlanControls(store.get(STUDY_PLAN_KEY, null));
      route();
      showSaveStatus("已匯入 " + entries.length + " 筆學習資料", "ok");
    };
    reader.readAsText(file);
  }

  function getPlanDaysValue() {
    const select = $("#plan-days");
    const custom = $("#custom-days");
    const raw = select && select.value === "custom" ? Number(custom && custom.value) : Number(select && select.value);
    return Math.max(3, Math.min(120, Number.isFinite(raw) ? Math.round(raw) : 30));
  }

  function getPlanMinutesValue() {
    const input = $("#plan-minutes");
    const raw = Number(input && input.value);
    return Math.max(10, Math.min(180, Number.isFinite(raw) ? Math.round(raw) : 35));
  }

  /*
   * 把實驗切成每日任務
   * 原本用 index % days 輪流發牌，第 1 天會拿到第 1、第 1+days、第 1+2days… 個實驗，
   * 等於每天都在不同章節之間跳來跳去，完全違反課程的先後順序。
   * 改成依課程順序切成連續區塊：同一天的實驗彼此相關，也維持章節的學習脈絡。
   */
  function distributePlan(ids, days) {
    const total = ids.length;
    const schedule = Array.from({ length: days }, (_, i) => ({ day: i + 1, ids: [] }));
    if (!total) return schedule;
    const base = Math.floor(total / days);
    const extra = total % days;   // 前 extra 天各多分一個，避免最後一天暴增
    let cursor = 0;
    for (let day = 0; day < days; day += 1) {
      const size = base + (day < extra ? 1 : 0);
      schedule[day].ids = ids.slice(cursor, cursor + size);
      cursor += size;
    }
    return schedule;
  }

  function createStudyPlan() {
    const days = getPlanDaysValue();
    const minutes = getPlanMinutesValue();
    const unseen = FLAT.map(f => f.exp.id).filter(id => !viewed.has(id));
    const fallback = FLAT.map(f => f.exp.id);
    const ids = unseen.length ? unseen : fallback;
    const plan = {
      version: 1,
      createdAt: new Date().toISOString(),
      startDate: todayKey(),
      days,
      minutes,
      totalTasks: ids.length,
      schedule: distributePlan(ids, days)
    };
    store.set(STUDY_PLAN_KEY, plan);
    renderStudyCenter();
    showSaveStatus("已建立 " + days + " 天學習計劃", "ok");
  }

  function goResumeStudy() {
    const last = store.get("pl-last-viewed", "");
    if (last && byId[last]) { location.hash = "#" + last; return; }
    goNextUnseen();
  }

  function goNextUnseen() {
    const target = FLAT.find(f => !viewed.has(f.exp.id)) || FLAT[0];
    if (target) location.hash = "#" + target.exp.id;
  }

  function clearStudyPlan() {
    localStorage.removeItem(STUDY_PLAN_KEY);
    renderStudyCenter();
    showSaveStatus("已清除學習計劃", "warn");
  }

  function syncPlanControls(plan) {
    const select = $("#plan-days");
    const customWrap = $("#custom-days-wrap");
    const custom = $("#custom-days");
    const minutes = $("#plan-minutes");
    if (!select) return;
    const days = plan ? plan.days : getPlanDaysValue();
    const preset = ["7", "14", "30"].includes(String(days));
    select.value = preset ? String(days) : "custom";
    if (customWrap) customWrap.hidden = select.value !== "custom";
    if (custom && !preset) custom.value = days;
    if (minutes) minutes.value = plan ? plan.minutes : minutes.value;
  }

  function renderTodayTasks(plan, dayIndex) {
    const list = $("#today-task-list");
    if (!list) return;
    list.innerHTML = "";
    if (!plan || dayIndex < 0 || dayIndex >= plan.schedule.length) return;
    const today = plan.schedule[dayIndex];
    const visible = today.ids.slice(0, 7);
    visible.forEach((id, index) => {
      const f = byId[id];
      if (!f) return;
      const task = el("button", "today-task" + (viewed.has(id) ? " done" : ""), list);
      task.type = "button";
      const no = el("span", "today-task-index", task); no.textContent = String(index + 1).padStart(2, "0");
      const name = el("span", "today-task-name", task); name.textContent = f.exp.title;
      if (viewed.has(id)) { const check = el("span", "today-task-check", task); check.textContent = "完成"; }
      task.addEventListener("click", () => location.hash = "#" + id);
    });
    if (today.ids.length > visible.length) {
      const more = el("div", "today-task more", list);
      const name = el("span", "today-task-name", more); name.textContent = "另外還有 " + (today.ids.length - visible.length) + " 個實驗，完成上方任務後可從側邊目錄繼續。";
    }
  }

  /*
   * 複習優先清單
   * 原本只是「完成比例最低的三個模組」，那其實是「還沒讀」而不是「需要複習」。
   * 改成綜合三個訊號排序，並直接告訴使用者為什麼這個模組排在前面：
   *   1. 章節檢核答錯或略過（最強訊號：已經讀過但概念沒抓穩）
   *   2. 練習題答錯過
   *   3. 還沒讀完的比例
   */
  function reviewPriority(mod) {
    const done = mod.experiments.filter(exp => viewed.has(exp.id)).length;
    const total = mod.experiments.length || 1;
    const checkpoint = store.get("pl-checkpoint-" + mod.id, null);
    const answers = getPracticeAnswers();
    const bank = window.PhysicsLabQuestionBank || {};

    let wrong = 0;
    mod.experiments.forEach(exp => {
      const questions = Array.isArray(bank[exp.id]) ? bank[exp.id] : null;
      Object.keys(answers).forEach(key => {
        if (key.indexOf(exp.id + "-q") !== 0) return;
        const index = Number(key.slice((exp.id + "-q").length));
        const correct = questions && questions[index] ? questions[index].correct : null;
        // 樣板題的正解索引會隨 order 變動，這裡只用有題庫的實驗來計算答錯數。
        if (correct != null && Number(answers[key]) !== correct) wrong += 1;
      });
    });

    let score = (1 - done / total) * 40;                       // 未讀比例：最多 40 分
    let reason = "尚未讀完";
    if (checkpoint && checkpoint.skipped) { score += 45; reason = "章節檢核略過"; }
    else if (checkpoint && checkpoint.score != null && checkpoint.total) {
      const rate = checkpoint.score / checkpoint.total;
      if (rate < 1) { score += (1 - rate) * 60; reason = "檢核 " + checkpoint.score + "/" + checkpoint.total; }
    }
    if (wrong > 0) { score += Math.min(30, wrong * 12); reason = "練習答錯 " + wrong + " 題"; }
    return { mod, done, total, score, reason, pct: done / total };
  }

  function renderReviewFocus() {
    const root = $("#review-focus-list");
    if (!root) return;
    root.innerHTML = "";
    const modules = C.modules.map(reviewPriority)
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score || a.mod.no - b.mod.no)
      .slice(0, 3);
    if (!modules.length) {
      const row = el("div", "review-focus-item", root);
      const name = el("span", "review-focus-name", row);
      name.textContent = "目前沒有需要優先複習的模組，繼續往下一章前進吧。";
      return;
    }
    modules.forEach(item => {
      const row = el("button", "review-focus-item", root);
      row.type = "button";
      row.style.setProperty("--m-color", item.mod.color);
      const name = el("span", "review-focus-name", row);
      name.textContent = "模組 " + item.mod.no + " · " + item.mod.title + "（" + item.reason + "）";
      const meta = el("span", "review-focus-meta", row); meta.textContent = item.done + " / " + item.total;
      const firstUnseen = item.mod.experiments.find(exp => !viewed.has(exp.id)) || item.mod.experiments[0];
      row.addEventListener("click", () => { if (firstUnseen) location.hash = "#" + firstUnseen.id; });
    });
  }

  function renderStudyCenter() {
    const title = $("#today-plan-title");
    const summary = $("#today-plan-summary");
    if (!title || !summary) return;
    const plan = store.get(STUDY_PLAN_KEY, null);
    syncPlanControls(plan);
    const allPlanned = plan ? plan.schedule.flatMap(day => day.ids).filter(id => byId[id]) : [];
    const allDone = allPlanned.filter(id => viewed.has(id)).length;
    const currentIndex = plan ? dayDiff(plan.startDate) : -1;
    const today = plan && currentIndex >= 0 && currentIndex < plan.schedule.length ? plan.schedule[currentIndex] : null;
    const todayTotal = today ? today.ids.length : 0;
    const todayDone = today ? today.ids.filter(id => viewed.has(id)).length : 0;
    const pct = todayTotal ? Math.round(todayDone / todayTotal * 100) : 0;
    const fill = $("#today-progress-fill"); if (fill) fill.style.width = pct + "%";
    const progressText = $("#today-progress-text"); if (progressText) progressText.textContent = todayDone + " / " + todayTotal;
    const progressPct = $("#today-progress-percent"); if (progressPct) progressPct.textContent = pct + "%";
    renderReviewFocus();

    if (!plan) {
      title.textContent = "尚未建立計劃";
      summary.textContent = "選擇天數後，系統會把尚未完成的實驗平均分配到每日任務。";
      renderTodayTasks(null, -1);
      return;
    }
    if (currentIndex >= plan.schedule.length) {
      title.textContent = "計劃已走完";
      summary.textContent = "這份 " + plan.days + " 天計劃共安排 " + plan.totalTasks + " 個實驗，目前已完成 " + allDone + " 個。可以重新建立下一輪複習。";
      renderTodayTasks(null, -1);
      return;
    }
    title.textContent = "第 " + (currentIndex + 1) + " 天 · " + plan.minutes + " 分鐘";
    summary.textContent = "今日安排 " + todayTotal + " 個實驗；整份計劃已完成 " + allDone + " / " + allPlanned.length + " 個。";
    renderTodayTasks(plan, currentIndex);
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

    /*
     * 模擬工作區
     * 程式碼採延遲載入，因此先顯示載入狀態，等對應的檔案就緒再建置。
     * 期間使用者若已經切到別的實驗（openToken 改變），就放棄這次建置，
     * 避免慢的網路下舊實驗蓋掉新實驗。
     */
    const simRoot = $("#sim-root");
    simRoot.innerHTML = "";
    const token = ++openToken;
    const loading = el("div", "sim-loading", simRoot);
    loading.setAttribute("role", "status");
    loading.textContent = "載入互動模擬…";

    ensureExperiment(exp.id).then(ready => {
      if (token !== openToken) return;          // 使用者已經換到別的實驗
      simRoot.innerHTML = "";
      if (!ready) {
        const empty = el("div", "empty", simRoot);
        empty.textContent = "此實驗的互動模擬尚在開發中。";
        return;
      }
      try {
        currentSim = PL.get(exp.id).build(simRoot) || {};
      } catch (err) {
        console.error("模擬載入失敗：" + exp.id, err);
        simRoot.innerHTML = "";
        const failed = el("div", "empty", simRoot);
        failed.textContent = "此模擬載入時發生問題，請重新整理後再試。";
      }
      prefetchNeighbours(f.order);
    });

    // 教材：公式與重點
    $("#guide-concept").textContent = exp.concept;
    $("#guide-formula").innerHTML = exp.formula;
    const ul = $("#guide-points"); ul.innerHTML = "";
    exp.points.forEach(p => { const li = el("li", null, ul); li.textContent = p; });
    renderPractice(f);
    typeset($("#guide-formula"));

    /*
     * 學習單入口
     * 競品分析的結論：老師採用一個教學網站的關鍵不是功能多寡，
     * 而是「能不能直接印一張紙帶進教室」。PhET 有 3,600 份教師活動，
     * 這裡至少要讓每個實驗都能一鍵取得對應的學習單。
     */
    const outputs = $("#learning-output");
    if (outputs) {
      const existing = outputs.querySelector(".worksheet-link-row");
      if (existing) existing.remove();
      const row = el("div", "worksheet-link-row", outputs);
      const link = el("a", "worksheet-link", row);
      link.href = "p/worksheet-" + encodeURIComponent(exp.id) + ".html";
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = "列印這個實驗的學習單";
      const note = el("span", "worksheet-link-note", row);
      note.textContent = "含資料記錄表格、作圖區與由圖求值欄位，可直接發給學生";
    }

    // 上一個 / 下一個
    const prev = FLAT[f.order - 1], next = FLAT[f.order + 1];
    setNav($("#nav-prev"), prev, "上一個實驗");
    setNav($("#nav-next"), next, "下一個實驗");

    // 進度與側邊高亮
    markVisited(id);
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
  /*
   * 之前「開啟＝已完成」，用方向鍵掃過一輪就會顯示 100%，
   * 學習進度、今日任務與複習清單全部失去意義。
   * 改成要真的停留或動手操作過，才算完成一個實驗。
   */
  const DWELL_MS = 20000;
  let dwellTimer = 0;
  let dwellId = null;

  function cancelDwell() {
    if (dwellTimer) { clearTimeout(dwellTimer); dwellTimer = 0; }
    dwellId = null;
  }

  function startDwell(id) {
    cancelDwell();
    dwellId = id;
    dwellTimer = setTimeout(() => { if (dwellId === id) completeExperiment(id); }, DWELL_MS);
    // 動手調整任何參數就立刻算數，不必等滿時間。
    const simRoot = $("#sim-root");
    if (!simRoot) return;
    const onInteract = () => { if (dwellId === id) completeExperiment(id); };
    ["pointerdown", "input", "change"].forEach(type =>
      simRoot.addEventListener(type, onInteract, { once: true, passive: true })
    );
  }

  function completeExperiment(id) {
    cancelDwell();
    if (viewed.has(id)) return;
    viewed.add(id);
    store.set("pl-progress", [...viewed]);
    refreshViewedMarks();
  }

  function markVisited(id) {
    store.set("pl-last-viewed", id);
    refreshViewedMarks();
    startDwell(id);
  }
  function refreshViewedMarks() {
    document.querySelectorAll(".exp-item").forEach(it => {
      it.classList.toggle("viewed", viewed.has(it.dataset.id));
    });
    const pct = Math.round(viewed.size / C.totalExperiments * 100);
    const fill = $("#progress-fill"); if (fill) fill.style.width = pct + "%";
    const lab = $("#progress-count"); if (lab) lab.textContent = viewed.size + " / " + C.totalExperiments;
    renderStudyCenter();
  }
  function resetProgress() {
    viewed = new Set(); store.set("pl-progress", []); localStorage.removeItem("pl-last-viewed");
    cancelDwell(); refreshViewedMarks();
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
    if (!hits.length) {
      // 搜尋字串來自使用者輸入，之前直接串進 innerHTML，等於把輸入當 HTML 執行。
      const empty = el("div", "empty", list);
      empty.textContent = "找不到符合「" + q + "」的實驗。";
    }
    hits.forEach(f => {
      const item = el("div", "sr-item", list);
      item.style.setProperty("--m-color", f.mod.color);
      const mod = el("div", "sr-mod", item); mod.textContent = "模組" + f.mod.no + " · " + f.mod.title;
      const title = el("div", "sr-title", item); title.textContent = f.exp.title;
      const desc = el("div", "sr-desc", item); desc.textContent = f.exp.concept;
      item.setAttribute("role", "button");
      item.setAttribute("tabindex", "0");
      item.addEventListener("click", () => location.hash = "#" + f.exp.id);
      item.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); location.hash = "#" + f.exp.id; }
      });
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

  /*
   * 對話框的鍵盤焦點鎖定
   * 兩個 role="dialog" aria-modal="true" 的面板原本都沒有鎖住 Tab，
   * 鍵盤使用者按幾下就會跑到後面看不見、也點不到的內容上。
   */
  const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function trapFocus(container, event) {
    if (event.key !== "Tab" || !container) return;
    const items = Array.from(container.querySelectorAll(FOCUSABLE))
      .filter(node => node.offsetParent !== null || node === document.activeElement);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

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
    // 略過也要留下記錄，否則每次跨章節都會再被同一組題目攔一次。
    if (checkpointState && !checkpointState.completed) {
      store.set("pl-checkpoint-" + checkpointState.mod.id, { score: null, skipped: true, completedAt: new Date().toISOString() });
    }
    checkpointState = null;
    pendingChapterTarget = null;
    const root = $("#chapter-checkpoint");
    root.hidden = true;
    document.body.classList.remove("checkpoint-active");
    if (target && byId[target]) openExp(target);
  }

  /*
   * 章節檢核該不該跳出來
   * 原本只要跨模組就一定攔一次：用方向鍵翻過章節交界、或回頭複習舊章節，
   * 都會被同一組題目重複打斷。改成三個條件都成立才出現：
   *   1. 這個模組還沒做過檢核（做過就永遠不再打擾）
   *   2. 這個模組確實讀過一定比例，檢核才有意義
   *   3. 是往前推進，不是回頭複習
   */
  const CHECKPOINT_MIN_RATIO = 0.5;

  function checkpointDone(modId) {
    return !!store.get("pl-checkpoint-" + modId, null);
  }

  function shouldShowCheckpoint(currentMod, targetMod) {
    if (!currentMod || !targetMod || currentMod.id === targetMod.id) return false;
    if (checkpointDone(currentMod.id)) return false;
    if (!Array.isArray(MODULE_CHECKPOINTS[currentMod.id]) || !MODULE_CHECKPOINTS[currentMod.id].length) return false;
    const total = currentMod.experiments.length;
    const seen = currentMod.experiments.filter(e => viewed.has(e.id)).length;
    if (!total || seen / total < CHECKPOINT_MIN_RATIO) return false;
    const currentIndex = C.modules.findIndex(m => m.id === currentMod.id);
    const targetIndex = C.modules.findIndex(m => m.id === targetMod.id);
    return targetIndex > currentIndex;
  }

  /* ------------------------------- 路由 ------------------------------- */
  function route() {
    const id = decodeURIComponent(location.hash.replace(/^#/, ""));
    if (!id || id === "home") {
      showView("home"); document.title = "物理實驗室｜台灣中學互動物理";
      cancelDwell();
      if (currentSim && currentSim.stop) { try { currentSim.stop(); } catch (e) {} }
      currentSim = null; currentId = null; return;
    }
    const target = byId[id];
    if (!target) { location.hash = ""; return; }
    const current = currentId ? byId[currentId] : null;
    if (shouldShowCheckpoint(current && current.mod, target.mod)) {
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
    // 沒有清掉目前實驗，解鎖後 route() 會誤以為是跨章節切換而彈出檢核。
    currentId = null;
    cancelDwell();
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
    /*
     * 閘門關閉時（合作結束後）直接進入實驗室，並把整個密碼面板從
     * 無障礙樹與版面中移除，避免螢幕報讀器仍然唸到一個不存在的表單。
     */
    if (!ACCESS_GATE_ENABLED) {
      const gate = $("#access-gate");
      if (gate && gate.parentNode) gate.parentNode.removeChild(gate);
      const lock = $("#lock-session");
      if (lock && lock.parentNode) lock.parentNode.removeChild(lock);
      unlockLab();
      return;
    }
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
    // 尚未解鎖時，Tab 必須留在密碼面板內（init() 的監聽器要解鎖後才註冊）
    document.addEventListener("keydown", e => {
      if (document.body.classList.contains("access-locked")) trapFocus($("#access-gate"), e);
    });
    setTimeout(() => input.focus(), 0);
  }

  /* ---------------------------------------------------------------------
     離線與安裝

     實驗程式改成延遲載入之後，Service Worker 也跟著改為「開到才快取」，
     否則一安裝就在背景抓 485 KB，等於把省下的流量又花掉一次。
     真正需要完整離線（例如老師要帶到沒有網路的教室）的人，
     在這裡主動按一次即可，是否要花這個流量由使用者決定。
     --------------------------------------------------------------------- */
  function initOfflineCard() {
    const status = $("#offline-status");
    const cacheBtn = $("#btn-cache-all");
    const installBtn = $("#btn-install");
    const progress = $("#offline-progress");
    const fill = $("#offline-progress-fill");
    const progressText = $("#offline-progress-text");
    if (!status || !cacheBtn) return;

    const supported = "serviceWorker" in navigator && location.protocol.startsWith("http");

    function describe() {
      if (!supported) {
        status.textContent = "這個瀏覽器（或以檔案方式開啟時）不支援離線功能，但所有內容仍可正常使用。";
        cacheBtn.disabled = true;
        return;
      }
      status.textContent = navigator.onLine
        ? "基本內容已可離線使用。按下方按鈕可把全部 245 個實驗一次存起來（約 485 KB），之後沒有網路也能開。"
        : "目前沒有網路連線。已經看過的實驗仍可正常開啟。";
    }
    describe();
    window.addEventListener("online", describe);
    window.addEventListener("offline", describe);

    // 連線狀態改變時，在頂欄給一個明確的提示
    function paintConnection() {
      document.body.classList.toggle("is-offline", !navigator.onLine);
    }
    paintConnection();
    window.addEventListener("online", paintConnection);
    window.addEventListener("offline", paintConnection);

    cacheBtn.addEventListener("click", () => {
      if (!supported || !navigator.serviceWorker.controller) {
        status.textContent = "離線功能尚未就緒，請重新整理後再試一次。";
        return;
      }
      cacheBtn.disabled = true;
      progress.hidden = false;
      progressText.textContent = "開始下載…";
      navigator.serviceWorker.controller.postMessage({ type: "cache-all-experiments" });
    });

    if (supported) {
      navigator.serviceWorker.addEventListener("message", event => {
        const data = event.data || {};
        if (data.type === "cache-progress") {
          const pct = Math.round(data.done / data.total * 100);
          fill.style.width = pct + "%";
          progressText.textContent = "已下載 " + data.done + " / " + data.total + " 個檔案";
        }
        if (data.type === "cache-complete") {
          fill.style.width = "100%";
          progressText.textContent = "完成，全部實驗都可以離線使用了。";
          cacheBtn.textContent = "已下載完成";
          try { store.set("pl-offline-cached", true); } catch (e) {}
        }
      });
      if (store.get("pl-offline-cached", false)) {
        cacheBtn.textContent = "已下載完成";
        cacheBtn.disabled = true;
      }
    }

    /*
     * 安裝到主畫面
     * 瀏覽器只在符合條件時才會觸發 beforeinstallprompt，
     * 因此按鈕預設隱藏，等瀏覽器願意才顯示——不做假的安裝引導。
     */
    let deferredPrompt = null;
    window.addEventListener("beforeinstallprompt", event => {
      event.preventDefault();
      deferredPrompt = event;
      if (installBtn) installBtn.hidden = false;
    });
    if (installBtn) {
      installBtn.addEventListener("click", async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        try { await deferredPrompt.userChoice; } catch (e) {}
        deferredPrompt = null;
        installBtn.hidden = true;
      });
    }
    window.addEventListener("appinstalled", () => {
      if (installBtn) installBtn.hidden = true;
      status.textContent = "已安裝到主畫面，可以像 App 一樣開啟。";
    });
  }

  /* ------------------------------- 啟動 ------------------------------- */
  function init() {
    auditCurriculum();
    auditCheckpointBank();
    buildSidebar();
    buildHome();
    renderStudyCenter();
    applyTheme(preferredTheme());

    $("#theme-toggle").addEventListener("click", () => {
      applyTheme(document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light");
    });
    const lockBtn = $("#lock-session");
    if (lockBtn) lockBtn.addEventListener("click", lockLab);
    $("#menu-toggle").addEventListener("click", toggleSidebar);
    $("#scrim").addEventListener("click", closeSidebarMobile);
    $("#brand-home").addEventListener("click", () => location.hash = "");
    $("#hero-start").addEventListener("click", () => location.hash = "#" + FLAT[0].exp.id);
    $("#hero-browse").addEventListener("click", () => $("#module-grid").scrollIntoView({ behavior: "smooth" }));
    $("#btn-reset").addEventListener("click", resetProgress);
    $("#btn-export-save").addEventListener("click", exportLearningSave);
    $("#home-export-save").addEventListener("click", exportLearningSave);
    $("#btn-import-save").addEventListener("click", () => $("#import-save-file").click());
    $("#home-import-save").addEventListener("click", () => $("#import-save-file").click());
    $("#import-save-file").addEventListener("change", event => {
      importLearningSave(event.target.files && event.target.files[0]);
      event.target.value = "";
    });
    $("#plan-days").addEventListener("change", () => syncPlanControls(store.get(STUDY_PLAN_KEY, null)));
    $("#btn-create-plan").addEventListener("click", createStudyPlan);
    $("#btn-clear-plan").addEventListener("click", clearStudyPlan);
    $("#btn-resume-study").addEventListener("click", goResumeStudy);
    $("#btn-next-unseen").addEventListener("click", goNextUnseen);

    // 每個按鍵都掃 237 筆實驗會讓打字卡頓，改成停手後才搜尋。
    const search = $("#search-input");
    let searchTimer = 0;
    search.addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => runSearch(search.value), 140);
    });
    search.addEventListener("keydown", e => {
      if (e.key === "Escape") { search.value = ""; runSearch(""); search.blur(); }
    });

    document.addEventListener("keydown", e => {
      if (checkpointState) {
        if (e.key === "Escape") leaveCheckpoint();
        trapFocus($("#checkpoint-panel"), e);
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
    initOfflineCard();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initAccessGate);
  else initAccessGate();
})();
