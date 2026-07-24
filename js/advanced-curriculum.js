/* 第三批課程地圖：將進階課本觀念、實驗分析與跨章應用做成獨立互動實驗。 */
(function () {
  "use strict";
  const C = window.PhysicsLabCurriculum;
  if (!C) return;
  const R = String.raw;
  const I = true;

  const ADDITIONS = {
    kinematics: [
      { id: "terminal-velocity", title: "空氣阻力與終端速度", interactive: I, concept: "落體速度提高後空氣阻力增大；當阻力與重力平衡，合力為零，物體便以終端速度等速下落。", formula: R`\( mg = bv_t^2,\quad v_t=\sqrt{mg/b} \)`, points: ["阻力方向永遠反向速度", "終端速度時加速度為零", "面積大或介質稠密時終端速度較小", "雨滴與降落傘都是實例"] },
      { id: "regression-lab", title: "最小平方法與殘差分析", interactive: I, concept: "對含有量測雜訊的資料做線性擬合，利用斜率、截距與殘差判讀模型是否合理。", formula: R`\( y=mx+b,\quad \text{SSE}=\sum_i(y_i-\hat y_i)^2 \)`, points: ["擬合線不必通過每個資料點", "殘差顯示偏離模型的程度", "斜率連結物理常數", "隨機雜訊與系統誤差不同"] },
      { id: "experimental-design", title: "實驗設計與變因控制", interactive: I, concept: "先選擇自變因、量測應變因並固定控制變因，才能讓資料回答單一明確的物理問題。", formula: R`\( y=f(x)\quad(\text{其他條件固定}) \)`, points: ["一次只改變主要自變因", "控制變因讓比較公平", "重複量測提高可靠度", "需先寫出可檢驗的預測"] },
      { id: "error-propagation", title: "不確定度傳遞", interactive: I, concept: "由多個量測值計算的新物理量也會帶有不確定度；比較不同儀器精度對結果的影響。", formula: R`\( \frac{\Delta Q}{Q}\approx\frac{\Delta A}{A}+\frac{\Delta B}{B} \)`, points: ["相對不確定度適合乘除關係", "小量測誤差會傳到最終結果", "先改善最大的誤差來源", "報告結果需帶不確定度"] },
      { id: "dimensional-analysis", title: "量綱分析與公式檢核", interactive: I, concept: "以基本量綱 M、L、T 檢查公式兩邊是否一致，並用量綱推測未知關係的形式。", formula: R`\( [F]=MLT^{-2},\quad [E]=ML^2T^{-2} \)`, points: ["等式兩側量綱必須相同", "量綱不能決定無量綱常數", "可快速排除錯誤公式", "單位換算需保持量綱一致"] }
    ],
    newton: [
      { id: "rolling-motion", title: "滾動不滑動與能量分配", interactive: I, concept: "物體無滑動地滾下斜面時，同時具有平動與轉動動能；轉動慣量不同會改變加速度。", formula: R`\( mgh=\frac12mv^2+\frac12I\omega^2,\quad v=\omega R \)`, points: ["實心球通常比圓環先到終點", "無滑動條件 v=ωR", "能量分到平動與轉動", "靜摩擦不做淨功"] }
    ],
    momentum: [
      { id: "multistage-rocket", title: "多級火箭與分離推進", interactive: I, concept: "火箭丟棄用盡燃料的級段後，剩餘系統質量下降，能更有效地把燃料轉換成速度改變。", formula: R`\( \Delta v=\sum v_{e,i}\ln\frac{m_{0,i}}{m_{f,i}} \)`, points: ["每次分離降低後續需加速的質量", "分級可累加速度增益", "推進本質是動量守恆", "需要考慮結構質量"] }
    ],
    gravity: [
      { id: "rotation-dynamics", title: "轉動動力學與角加速度", interactive: I, concept: "對固定軸剛體施加力矩會造成角加速度；同一力矩下，轉動慣量越大越難改變轉速。", formula: R`\( \tau=I\alpha,\quad \omega=\omega_0+\alpha t \)`, points: ["力矩是轉動的驅動量", "I 類似直線運動中的質量", "力臂越長力矩越大", "角加速度方向依右手定則"] },
      { id: "angular-velocity-vector", title: "角速度向量與右手定則", interactive: I, concept: "角速度與角加速度是向量，方向沿轉軸；用右手四指指向旋轉方向，大拇指就是向量方向。", formula: R`\( \vec v=\vec\omega\times\vec r \)`, points: ["角速度向量垂直於轉動平面", "線速度與半徑垂直", "反轉旋轉則向量反向", "可連結陀螺與行星自轉"] },
      { id: "hohmann-transfer", title: "霍曼轉移軌道", interactive: I, concept: "在兩條同心圓軌道間，常用橢圓轉移軌道改變半徑；需要在兩個節點各施加一次速度改變。", formula: R`\( \Delta v=\Delta v_1+\Delta v_2 \)`, points: ["轉移軌道是橢圓", "近日點與遠日點分別點火", "較遠軌道週期更長", "衛星任務常用此策略"] },
      { id: "tidal-roche", title: "潮汐力與洛希極限", interactive: I, concept: "天體不同位置受到的重力略有差異，形成潮汐力；距離太近時衛星可能被主星的潮汐力撕裂。", formula: R`\( \Delta g\propto\frac{1}{r^3},\quad d_R\approx2.44R\left(\frac{\rho_M}{\rho_m}\right)^{1/3} \)`, points: ["潮汐力來自重力梯度", "近側與遠側都會形成潮汐隆起", "距離越近效應急遽增加", "環系統可與洛希極限相關"] }
    ],
    thermal: [
      { id: "heat-transfer", title: "熱傳導、對流與輻射", interactive: I, concept: "熱能可藉傳導、流體對流與電磁輻射傳遞；比較材料、表面與溫差對冷卻速率的影響。", formula: R`\( \dot Q_{cond}=kA\frac{\Delta T}{L},\quad P_{rad}\propto T^4 \)`, points: ["傳導需要粒子碰撞", "對流依賴流體整體流動", "輻射不需要介質", "保溫減少熱傳遞率"] },
      { id: "thermal-expansion", title: "熱膨脹與雙金屬片", interactive: I, concept: "升溫會使固體、液體或氣體尺度增加；兩種膨脹係數不同的金屬片受熱會彎曲。", formula: R`\( \Delta L=\alpha L_0\Delta T \)`, points: ["膨脹量與原長和溫差成正比", "不同材料的 α 不同", "鐵軌需預留伸縮縫", "雙金屬片可用於溫控開關"] },
      { id: "viscosity-reynolds", title: "黏滯力與雷諾數", interactive: I, concept: "流體黏滯力阻礙相對運動；雷諾數可用來判斷流動較接近層流或紊流。", formula: R`\( F_d=6\pi\eta rv,\quad Re=\frac{\rho vD}{\eta} \)`, points: ["黏度大時阻力更大", "低雷諾數常見層流", "高雷諾數容易形成紊流", "可連結血流、管流與空氣阻力"] },
      { id: "continuity-hydraulic", title: "連續方程與液壓機", interactive: I, concept: "不可壓縮流體在管內流動時流量守恆；密閉液體亦可依帕斯卡原理傳遞壓力、放大力。", formula: R`\( A_1v_1=A_2v_2,\quad \frac{F_1}{A_1}=\frac{F_2}{A_2} \)`, points: ["截面縮小則流速增加", "流量在各截面相同", "液壓機能以小力舉重物", "力放大不違反能量守恆"] }
    ],
    waves: [
      { id: "huygens-principle", title: "惠更斯原理與波前", interactive: I, concept: "波前上每一點都可視為次波源，新波前是這些次波的包絡面；可直觀看出反射、折射與繞射。", formula: R`\( v=\lambda f \)`, points: ["波前垂直於傳播方向", "次波疊成新的波前", "介質改變可使波前轉向", "是幾何光學與波動光學的橋梁"] }
    ],
    optics: [
      { id: "malus-law", title: "馬呂士定律與偏振片", interactive: I, concept: "線偏振光通過分析器時，透射光強取決於兩偏振方向的夾角。", formula: R`\( I=I_0\cos^2\theta \)`, points: ["平行時透光最強", "互相垂直時理想上全暗", "強度與 cos²θ 成正比", "偏光太陽眼鏡是應用"] },
      { id: "thin-film", title: "薄膜干涉與結構色", interactive: I, concept: "肥皂泡或油膜上下表面的反射光會產生光程差，不同厚度對不同波長形成增強或相消。", formula: R`\( 2nt=(m+\tfrac12)\lambda \)`, points: ["顏色隨厚度與觀察角變化", "反射可能伴隨半波損失", "白光可分出彩色條紋", "蝴蝶翅膀與油膜有結構色"] },
      { id: "fizeau-light-speed", title: "斐索齒輪與光速量測", interactive: I, concept: "讓光通過旋轉齒輪前往遠方反射鏡並折返，調整轉速使回光被下一齒遮住，可估算光速。", formula: R`\( c\approx4dNf \)`, points: ["往返路徑增加可量測時間", "遮光條件連結齒數與轉速", "光速極大但仍可實驗量測", "是歷史上重要的地面測量法"] }
    ],
    electric: [
      { id: "rl-transient", title: "RL 暫態與反電動勢", interactive: I, concept: "線圈通電時電流不會瞬間增至穩態，因自感會反抗電流變化；切斷電源時也會維持原電流。", formula: R`\( I(t)=\frac{V}{R}(1-e^{-tR/L}) \)`, points: ["電感反抗電流改變", "時間常數 τ=L/R", "電流連續但斜率可變", "繼電器與馬達線圈需防反向高壓"] },
      { id: "diode-rectifier", title: "二極體整流與濾波", interactive: I, concept: "二極體只允許主要方向的電流通過，可把交流轉成脈動直流；加入電容可降低漣波。", formula: R`\( V_{out}\approx|V_0\sin\omega t| \)`, points: ["半波整流只保留一半波形", "全波整流頻率加倍", "濾波電容在峰值充電", "實際二極體有導通壓降"] },
      { id: "semiconductor-led", title: "PN 接面與 LED 發光", interactive: I, concept: "正向偏壓降低 PN 接面障壁，電子與電洞復合時可釋放能量；LED 顏色與能隙相關。", formula: R`\( E_g\approx\frac{hc}{\lambda} \)`, points: ["PN 接面具有方向性", "正向偏壓導通、反向偏壓截止", "能隙決定發光顏色", "LED 需串聯限流電阻"] },
      { id: "oscilloscope", title: "示波器與訊號量測", interactive: I, concept: "示波器把電壓隨時間顯示成波形，可量測振幅、週期、頻率與兩訊號相位差。", formula: R`\( f=1/T,\quad V_{pp}=2V_0 \)`, points: ["垂直軸代表電壓", "水平軸代表時間", "觸發可穩定波形", "可比較正弦、方波與直流訊號"] }
    ],
    magnetism: [
      { id: "hall-effect", title: "霍爾效應與載子方向", interactive: I, concept: "通電半導體置於垂直磁場時，載子受洛倫茲力偏向一側並產生霍爾電壓，可判斷主要載子正負。", formula: R`\( V_H=\frac{IB}{nqt} \)`, points: ["霍爾電壓與電流和磁場成正比", "極性可辨識載子符號", "厚度較薄訊號較大", "磁場感測器的基礎"] },
      { id: "current-balance", title: "電流天平與安培力量測", interactive: I, concept: "將通電導線置於均勻磁場，用天平量到的微小力可驗證安培力與 I、B、L 的關係。", formula: R`\( F=BIL \)`, points: ["量測力對電流作圖可得斜率", "導線應垂直磁場", "可比較正反電流", "是電磁力的定量實驗"] },
      { id: "eddy-current", title: "渦電流與磁煞車", interactive: I, concept: "磁鐵靠近導體時，導體內感應出的渦電流會依楞次定律阻礙相對運動，形成非接觸式煞車。", formula: R`\( \varepsilon=-\frac{d\Phi_B}{dt} \)`, points: ["感應電流方向反抗磁通改變", "速度越快煞車越明顯", "導體不需接成外電路", "雲霄飛車與電表常用"] },
      { id: "em-polarization", title: "電磁波偏振", interactive: I, concept: "電磁波的電場與磁場皆垂直於傳播方向；偏振器選出特定電場振動方向。", formula: R`\( \vec E\perp\vec B\perp\vec k \)`, points: ["電磁波為橫波", "電場方向定義偏振方向", "兩偏振器可控制透射強度", "無線通訊需匹配天線偏振"] },
      { id: "antenna-resonance", title: "天線共振與波長匹配", interactive: I, concept: "天線長度接近電磁波的特定分數波長時，電流分布形成共振，收發效率提高。", formula: R`\( L\approx\lambda/4,\quad c=\lambda f \)`, points: ["頻率越高波長越短", "四分之一波長天線很常見", "失配會降低收發效率", "天線方向與偏振有關"] }
    ],
    modern: [
      { id: "quantum-transitions", title: "量子能階與躍遷光譜", interactive: I, concept: "原子電子只能處在離散能階，跨越能階時吸收或放出特定能量的光子，形成線光譜。", formula: R`\( \Delta E=hf=\frac{hc}{\lambda} \)`, points: ["能階是離散的", "向下躍遷放出光子", "波長對應能量差", "光譜可辨識元素"] },
      { id: "uncertainty-principle", title: "不確定性原理與波包", interactive: I, concept: "把粒子侷限在較小區域時，波包需要更多波數成分，因此動量的不確定度會增加。", formula: R`\( \Delta x\Delta p\ge\hbar/2 \)`, points: ["不是儀器不夠精準造成", "位置越集中動量分布越寬", "量子態以機率描述", "波包展現粒子與波的連結"] },
      { id: "twins-paradox", title: "雙生子佯謬與同時性", interactive: I, concept: "高速旅行者的固有時間較短；折返使兩人的參考系不對稱，因此回到地球後旅行者較年輕。", formula: R`\( \Delta t=\gamma\Delta \tau \)`, points: ["時間膨脹由相對速度產生", "旅行者在折返時更換慣性系", "固有時間沿自身世界線累積", "GPS 需要相對論修正"] },
      { id: "radiation-shielding", title: "α、β、γ 輻射與屏蔽", interactive: I, concept: "不同輻射的穿透力與電離能力不同；選擇紙、鋁、鉛等屏蔽材料並量測偵測計數。", formula: R`\( I=I_0e^{-\mu x} \)`, points: ["α 可被紙擋住", "β 常用鋁板屏蔽", "γ 需較厚高密度材料", "安全原則是時間、距離、屏蔽"] },
      { id: "binding-energy", title: "束縛能曲線與核融合分裂", interactive: I, concept: "每核子束縛能在鐵附近最大；輕核融合與重核分裂都可朝更穩定的方向釋放能量。", formula: R`\( E_b=\Delta mc^2 \)`, points: ["鐵附近最穩定", "輕核融合釋能", "重核分裂釋能", "能量來自質量虧損"] },
      { id: "exoplanet-transit", title: "系外行星凌日法", interactive: I, concept: "行星從恆星前方通過時，觀測亮度會短暫下降；由週期與下降深度可推論軌道與相對大小。", formula: R`\( \frac{\Delta F}{F}\approx\left(\frac{R_p}{R_*}\right)^2 \)`, points: ["凌日深度反映半徑比", "重複凌日可得週期", "需排除星斑等假訊號", "是搜尋系外行星主力方法"] },
      { id: "hr-diagram", title: "赫羅圖與恆星演化", interactive: I, concept: "以表面溫度與光度排列恆星，可看出主序帶、巨星與白矮星等族群與演化路徑。", formula: R`\( L=4\pi R^2\sigma T^4 \)`, points: ["橫軸溫度通常向右降低", "主序星佔多數", "巨星半徑大而明亮", "恆星質量主導演化速度"] },
      { id: "cosmic-distance-ladder", title: "宇宙距離梯與標準燭光", interactive: I, concept: "由視差、造父變星到 Ia 型超新星逐級校準宇宙距離，才能建立遙遠星系的距離尺度。", formula: R`\( m-M=5\log_{10}(d/10\,pc) \)`, points: ["近距離先用幾何視差", "造父變星週期可推光度", "超新星可作標準燭光", "距離是哈伯定律的關鍵"] }
    ]
  };

  C.modules.forEach(module => module.experiments.push(...(ADDITIONS[module.id] || [])));
  let total = 0, interactive = 0;
  C.modules.forEach(module => module.experiments.forEach(experiment => { total++; if (experiment.interactive) interactive++; }));
  C.totalExperiments = total;
  C.totalInteractive = interactive;
})();
