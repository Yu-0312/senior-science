/* 第五、六批：資料驅動的跨領域與大學先修題型庫，可由後續檔案無上限追加。 */
(function () {
  "use strict";
  const C = window.PhysicsLabCurriculum;
  if (!C || !C.extendCatalog) return;
  const R = String.raw, I = true;

  C.extendCatalog("cross-domain-labs-2026-07", {
    thermal: [
      { id: "u-tube-manometer", title: "U 形管壓力計", interactive: I, concept: "兩側液面高度差反映壓力差。改變外加壓力與液體密度，觀察高度差如何轉成壓力讀值。", formula: R`\( \Delta P=\rho g\Delta h \)`, points: ["高度差代表壓力差", "液體密度越大同壓差高度差越小", "兩液面同高表示壓力相等", "可量測氣體壓力"] },
      { id: "metal-specific-heat", title: "金屬比熱的混合法量測", interactive: I, concept: "將加熱後的金屬放入水中，金屬放熱與水吸熱相等。由平衡溫度可反推金屬的比熱。", formula: R`\( m_mc_m(T_m-T_f)=m_wc_w(T_f-T_w) \)`, points: ["高溫物體放熱、低溫物體吸熱", "熱平衡時溫度相同", "容器吸熱會造成系統誤差", "比熱反映升溫難易"] },
      { id: "heat-conduction", title: "導熱棒與熱傳導率", interactive: I, concept: "導熱功率受材料、截面積、長度與兩端溫差影響。比較金屬棒與保溫材的穩定熱流。", formula: R`\( P=\dfrac{kA\Delta T}{L} \)`, points: ["溫差越大熱流越大", "棒越長傳熱越慢", "截面積越大傳熱越快", "不同材料的導熱率不同"] }
    ],
    waves: [
      { id: "seismic-triangulation", title: "地震 P、S 波到時差定位", interactive: I, concept: "P 波速度較快、S 波速度較慢；同一測站的到時差可估地震距離，多站資料可交會定位震央。", formula: R`\( d=\dfrac{\Delta t}{1/v_S-1/v_P} \)`, points: ["P 波先到、S 波後到", "到時差越大代表距離越遠", "至少三個測站可定位震央", "速度模型影響定位誤差"] },
      { id: "string-harmonic-spectrum", title: "弦的諧波與音高", interactive: I, concept: "固定兩端的弦只能形成整數倍諧波。改變長度、張力與線密度，觀察基頻及泛音如何改變。", formula: R`\( f_n=\dfrac{n}{2L}\sqrt{\dfrac{T}{\mu}} \)`, points: ["基頻是最低共振頻率", "諧波頻率為基頻整數倍", "張力增加使音高升高", "弦越短音高越高"] },
      { id: "noise-barrier", title: "噪音屏障與聲強衰減", interactive: I, concept: "聲音向外擴散會因距離而衰減，屏障的隔音量又會降低到達接收者的聲強。", formula: R`\( I=\dfrac{I_0}{r^2}10^{-IL/10} \)`, points: ["距離加倍聲強約變為四分之一", "分貝差為對數尺度", "屏障需遮住直接聲路", "低頻聲較難隔絕"] }
    ],
    optics: [
      { id: "lens-combination", title: "薄透鏡組合與等效焦距", interactive: I, concept: "兩片薄透鏡相隔很近時，總會聚能力可相加；將凸、凹透鏡組合可改變整體焦距。", formula: R`\( \dfrac{1}{f_{eq}}=\dfrac{1}{f_1}+\dfrac{1}{f_2} \)`, points: ["會聚透鏡焦距取正", "發散透鏡焦距取負", "透鏡組合可縮短或拉長焦距", "望遠鏡與相機常使用多片透鏡"] },
      { id: "photometry-inverse-square", title: "照度與反平方定律", interactive: I, concept: "點光源的光通量分布在越大的球面上，接收面的照度因此隨距離平方下降。", formula: R`\( E=\dfrac{I}{r^2} \)`, points: ["距離加倍照度約剩四分之一", "光源亮度與距離須分開判讀", "攝影與照明要考慮距離", "模型假設點光源與無吸收"] },
      { id: "prism-spectrometer", title: "稜鏡最小偏向角量折射率", interactive: I, concept: "光在稜鏡中對稱通過時偏向角最小；量得頂角與最小偏向角，可計算材料折射率。", formula: R`\( n=\dfrac{\sin[(A+D_m)/2]}{\sin(A/2)} \)`, points: ["最小偏向時光路對稱", "頂角與偏向角決定折射率", "不同波長有不同折射率", "可用於光譜分析"] }
    ],
    electric: [
      { id: "voltage-divider", title: "分壓器與感測器讀值", interactive: I, concept: "兩個串聯電阻分配電源電壓；用可變電阻或光敏電阻可把環境變化轉為可量測的輸出電壓。", formula: R`\( V_{out}=V_{in}\dfrac{R_2}{R_1+R_2} \)`, points: ["串聯電流相同", "輸出取決於電阻比例", "輸入電阻會造成負載效應", "常用於感測器介面"] },
      { id: "rc-timer", title: "RC 計時與延遲電路", interactive: I, concept: "電容透過電阻充電時電壓呈指數上升。調整 R、C 可設計不同的延遲與計時時間。", formula: R`\( V_C=E(1-e^{-t/RC}) \)`, points: ["時間常數為 RC", "經過一個時間常數約充到 63%", "R 或 C 增加會使反應變慢", "可用於閃爍與延遲電路"] },
      { id: "electrolysis", title: "電解與法拉第定律", interactive: I, concept: "電流通過電解液會在電極上析出物質。通過的電量越多，析出質量越大。", formula: R`\( m=\dfrac{ItM}{nF} \)`, points: ["電量 Q=It", "析出量與電流、時間成正比", "不同離子價數改變析出量", "電鍍與電解精煉是應用"] }
    ],
    magnetism: [
      { id: "tangent-galvanometer", title: "正切電流計與地磁場", interactive: I, concept: "圓形線圈磁場與地磁場疊加，磁針偏角的正切可用來連結線圈電流與地磁場。", formula: R`\( \tan\theta=\dfrac{\mu_0NI}{2rB_E} \)`, points: ["磁針沿合磁場方向", "電流越大偏角越大", "線圈半徑會影響磁場", "可估測地磁場量級"] },
      { id: "cyclotron-frequency", title: "迴旋加速器與迴旋頻率", interactive: I, concept: "帶電粒子在垂直磁場中繞圓運動，非相對論近似下迴旋頻率與速率、半徑無關。", formula: R`\( f=\dfrac{qB}{2\pi m} \)`, points: ["磁力提供向心力", "頻率與磁場成正比", "頻率與粒子質量成反比", "高速時需考慮相對論修正"] },
      { id: "mutual-induction", title: "互感與變壓器耦合", interactive: I, concept: "原線圈電流改變會使副線圈磁通量改變，因而感應出電動勢；改變越快，感應電壓越大。", formula: R`\( \varepsilon=-M\dfrac{\Delta I}{\Delta t} \)`, points: ["只有變動電流才會感應", "互感量取決於線圈耦合", "方向遵守楞次定律", "是變壓器工作的核心"] }
    ],
    modern: [
      { id: "geiger-statistics", title: "蓋革計數與隨機誤差", interactive: I, concept: "放射性衰變是隨機事件；固定時間內的計數會上下波動，標準差約為計數平方根。", formula: R`\( \sigma_N\approx\sqrt{N} \)`, points: ["衰變無法預測單一原子何時發生", "計數越多相對誤差越小", "背景計數要扣除", "可用重複量測判讀統計波動"] }
    ]
  });

  C.extendCatalog("university-bridge-labs-2026-07", {
    newton: [
      
    ],
    gravity: [
      
    ],
    shm: [
      
    ],
    thermal: [
      
    ],
    waves: [
      
    ],
    optics: [
      { id: "fresnel-diffraction", title: "菲涅耳繞射與菲涅耳數", interactive: I, concept: "當光屏距離不遠時，繞射圖樣由近場的菲涅耳區控制。改變孔徑與傳播距離，可觀察近場與遠場的過渡。", formula: R`\( N_F=\dfrac{a^2}{\lambda z} \)`, points: ["菲涅耳數比較孔徑與傳播距離", "N_F 大時屬於近場繞射", "N_F 很小時趨近夫朗和斐繞射", "繞射決定成像系統的解析度極限"] }
    ],
    electric: [
      { id: "bode-low-pass", title: "RC 低通濾波器的頻率響應", interactive: I, concept: "RC 低通濾波器會保留低頻、衰減高頻。掃描輸入頻率可觀察增益曲線，並連結電路設計與訊號處理的波德圖概念。", formula: R`\( |H(f)|=\dfrac{1}{\sqrt{1+(f/f_c)^2}} \)`, points: ["截止頻率是增益降為 -3 dB 的位置", "低頻近似完整通過", "高頻增益約隨頻率反比下降", "波德圖通常使用對數頻率軸"] }
    ],
    magnetism: [
      { id: "biot-savart-axis", title: "畢奧－沙伐定律與圓線圈軸線磁場", interactive: I, concept: "圓形線圈上每一小段電流都對軸線點貢獻磁場，疊加後可得到軸向磁場分布。", formula: R`\( B(z)=\dfrac{\mu_0NIR^2}{2(R^2+z^2)^{3/2}} \)`, points: ["磁場由電流元疊加而成", "線圈中心的磁場最大", "離開中心後磁場快速減弱", "是亥姆霍茲線圈與磁場校正的基礎"] }
    ],
    modern: [
      
    ]
  });

  // 課程不是把不同學段的內容堆在一起，而是讓同一個核心概念逐步加深。
  // app.js 讀取這份資料建立首頁路徑與各實驗頁的前後銜接導覽。
  C.learningPaths = [
    {
      id: "motion",
      title: "運動與力",
      description: "從描述運動、畫圖，到用模型預測振動與天體運動。",
      stages: [
        { level: "國中打底", kind: "junior", note: "先用反應尺、超音波測距與自由落體，把位置與時間量出來。", ids: ["reaction-time", "motion-sensor", "freefall"] },
        { level: "高中建模", kind: "senior", note: "再用運動圖像、牛頓定律與能量守恆解題。", ids: ["uniform-accel", "newton2", "energy-track"] },
        { level: "大學延伸", kind: "university", note: "最後把轉動、物理擺與耦合振子放上實驗台，看多物體系統怎麼動。", ids: ["rotation-dynamics", "physical-pendulum", "coupled-oscillators"] }
      ]
    },
    {
      id: "thermal",
      title: "熱與能量",
      description: "從溫度與熱傳遞，走到能量流動及不可逆過程。",
      stages: [
        { level: "國中打底", kind: "junior", note: "先分辨溫度、熱與物態變化，並用試管噴塞理解內能如何轉成機械能。", ids: ["gas-laws", "heat", "phase-change", "heat-engine-principle"] },
        { level: "高中建模", kind: "senior", note: "用熱力學第一定律、熱傳遞與熱量計把能量帳量出來。", ids: ["thermo1", "heat-transfer", "calorimetry-mixing"] },
        { level: "大學延伸", kind: "university", note: "用導熱棒與冷卻曲線，把熱流寫成可以量測的定律。", ids: ["heat-conduction", "newton-cooling"] }
      ]
    },
    {
      id: "wave-optics",
      title: "波動與光",
      description: "由可見的振動與聲音出發，逐步讀懂干涉、繞射與頻譜。",
      stages: [
        { level: "國中打底", kind: "junior", note: "從波的種類、聲音特性與光影現象建立畫面。", ids: ["wave-types", "sound-properties", "shadow-pinhole"] },
        { level: "高中建模", kind: "senior", note: "以疊加、駐波與干涉繞射連結波形和觀測結果。", ids: ["superposition", "standing-wave", "double-slit", "diffraction"] },
        { level: "大學延伸", kind: "university", note: "再從弦的諧波聽出音色，並比較近場與遠場繞射。", ids: ["string-harmonic-spectrum", "fresnel-diffraction"] }
      ]
    },
    {
      id: "electromagnetism",
      title: "電與磁",
      description: "從安全量測電路，到訊號處理與磁場疊加的進階模型。",
      stages: [
        { level: "國中打底", kind: "junior", note: "先以電壓、電流、電阻和磁場方向建立操作感。", ids: ["ohms", "resistors", "current-field"] },
        { level: "高中建模", kind: "senior", note: "進一步量測電容、電磁感應與交流共振的變化。", ids: ["capacitor", "induction", "rlc-resonance"] },
        { level: "大學延伸", kind: "university", note: "最後用頻率響應與電流元疊加描述真實系統。", ids: ["bode-low-pass", "biot-savart-axis"] }
      ]
    },
    {
      id: "modern",
      title: "光、原子與量子",
      description: "從色光與光譜的可見現象，走向量子化的能階模型。",
      stages: [
        { level: "國中打底", kind: "junior", note: "先透過色光混合、色散與稜鏡觀察光的線索。", ids: ["rgb-color-mixing", "dispersion", "prism-spectrometer"] },
        { level: "高中建模", kind: "senior", note: "以光電效應、發射光譜與油滴實驗建立量子化的觀念。", ids: ["photoelectric", "spectroscopy", "millikan"] },
        { level: "大學延伸", kind: "university", note: "最後用散射實驗與蓋革計數，看原子核與量子的隨機性。", ids: ["rutherford", "geiger-statistics"] }
      ]
    }
  ];
})();
