/* 第五批：資料驅動的跨領域題型庫。可由後續檔案無上限追加。 */
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
      { id: "geiger-statistics", title: "蓋革計數與隨機誤差", interactive: I, concept: "放射性衰變是隨機事件；固定時間內的計數會上下波動，標準差約為計數平方根。", formula: R`\( \sigma_N\approx\sqrt{N} \)`, points: ["衰變無法預測單一原子何時發生", "計數越多相對誤差越小", "背景計數要扣除", "可用重複量測判讀統計波動"] },
      { id: "nuclear-energy-release", title: "核反應的質量虧損與能量", interactive: I, concept: "核反應前後的靜止質量差會依質能互換轉為動能與輻射能，是核能釋放的來源。", formula: R`\( E=\Delta mc^2 \)`, points: ["極小質量可對應巨大能量", "需比較反應前後總質量", "束縛能差決定是否釋能", "核反應需遵守守恆定律"] },
      { id: "gps-relativity", title: "GPS 的相對論時間校正", interactive: I, concept: "衛星的高速運動使時鐘變慢，而較弱重力又使時鐘變快；GPS 必須同時校正兩種效應。", formula: R`\( \Delta t_v\approx-\dfrac{v^2}{2c^2}t \)`, points: ["速度效應使衛星鐘變慢", "重力效應使衛星鐘變快", "兩種效應量級不同", "未校正會累積成定位誤差"] }
    ]
  });
})();
