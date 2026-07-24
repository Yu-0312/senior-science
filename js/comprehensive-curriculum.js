/*
 * 第四批課程地圖：補齊國中生活物理、量測實作與高中延伸的關鍵知識鏈。
 * 每筆資料皆對應 comprehensive.js 中的即時 Canvas 實驗。
 */
(function () {
  "use strict";
  const C = window.PhysicsLabCurriculum;
  if (!C) return;
  const R = String.raw;
  const I = true;

  const ADDITIONS = {
    kinematics: [
      { id: "unit-conversion", title: "單位換算與尺度估計", interactive: I, concept: "同一物理量可用不同單位表示；先選擇合適尺度，再用倍率正確換算，才能判讀量測結果。", formula: R`\( 1\ \mathrm{m}=10^3\ \mathrm{mm},\quad 1\ \mathrm{km}=10^3\ \mathrm{m} \)`, points: ["單位是量測值的一部分", "公制單位以十進位換算", "先估量級可發現錯誤", "面積與體積的換算要平方或立方"] },
      { id: "motion-sensor", title: "超音波測距與位置—時間圖", interactive: I, concept: "測距感測器定時記錄人或車的位置，可直接得到位置—時間圖並由斜率判讀速度。", formula: R`\( v=\frac{\Delta x}{\Delta t} \)`, points: ["水平圖線代表靜止", "斜率越大速度越快", "斜率正負代表運動方向", "感測器可取代手動計時"] },
      { id: "reaction-time", title: "反應時間與平均速率", interactive: I, concept: "駕駛或接尺時，反應時間內物體仍會前進；把速率乘上反應時間可估算反應距離。", formula: R`\( d=vt,\quad \bar v=\frac{\text{路程}}{\text{時間}} \)`, points: ["反應距離與速率成正比", "疲勞會增加反應時間", "煞車距離另受摩擦影響", "平均速率以總路程除總時間"] }
    ],
    newton: [
      { id: "lever-machine", title: "槓桿、支點與省力", interactive: I, concept: "槓桿平衡時兩側力矩相等；延長施力臂可用較小的力舉起重物，但需要拉動較長距離。", formula: R`\( F_{\text{施}}d_{\text{施}}=F_{\text{阻}}d_{\text{阻}} \)`, points: ["支點到作用線距離是力臂", "省力與省距離不能同時取得", "鉗子與撬棒都是槓桿", "平衡看合力矩是否為零"] },
      { id: "pulley-system", title: "定滑輪、動滑輪與機械利益", interactive: I, concept: "定滑輪改變施力方向，動滑輪以多段繩支撐重物而省力；摩擦會降低實際效率。", formula: R`\( MA=\frac{F_{\text{負載}}}{F_{\text{施力}}}\approx n \)`, points: ["支撐繩段越多越省力", "需拉動更長的繩子", "理想情況輸入功等於輸出功", "摩擦使效率小於 100%"] },
      { id: "contact-pressure", title: "壓力、受力面積與壓強", interactive: I, concept: "同樣的力作用在較小面積上會產生較大的壓強，能解釋針尖、雪鞋與履帶的設計。", formula: R`\( P=\frac{F}{A} \)`, points: ["壓力是垂直作用於表面的力", "壓強是每單位面積的力", "面積變小壓強變大", "單位為帕 Pa"] },
      { id: "truss-bridge", title: "桁架橋與結構受力", interactive: I, concept: "橋梁以三角形桁架分散載重；改變載重位置與支撐跨度，觀察桿件的拉力與壓力。", formula: R`\( \sum F_x=0,\quad \sum F_y=0,\quad \sum\tau=0 \)`, points: ["三角形結構較穩定", "支撐反力由平衡決定", "中間載重通常使彎矩變大", "拉桿與壓桿承受不同作用"] }
    ],
    momentum: [
      { id: "water-rocket", title: "水火箭與反作用力", interactive: I, concept: "加壓空氣把水高速向下噴出，火箭因反作用力向上加速；水量與壓力會改變推力與飛行結果。", formula: R`\( F\approx\dot m v_e,\quad \Delta p_{\text{火箭}}=-\Delta p_{\text{水}} \)`, points: ["噴出的水帶走向下動量", "火箭不需依靠空氣推進", "壓力提高可增加初始推力", "水量過多會增加總質量"] },
      { id: "crumple-zone", title: "緩衝區與碰撞安全", interactive: I, concept: "碰撞時改變動量所需衝量固定；安全氣囊、頭盔與車體緩衝區延長停止時間，可降低峰值力。", formula: R`\( F_{\text{平均}}\Delta t=\Delta p \)`, points: ["力—時間圖面積是衝量", "延長停止時間可降低力", "質量與速率越大衝擊越大", "安全設計不改變動量定理"] },
      { id: "skateboard-push", title: "滑板推離與質心", interactive: I, concept: "兩人站在滑板上互推時，系統總動量守恆，質量較小者速度較大，而質心位置不受內力改變。", formula: R`\( m_1v_1+m_2v_2=0 \)`, points: ["內力成對出現", "總動量保持零", "質量較小者退得較快", "質心在外力為零時不加速"] }
    ],
    energy: [
      { id: "energy-forms", title: "能量形式與轉換效率", interactive: I, concept: "裝置可把化學能、位能、動能、電能與熱能互相轉換；有用輸出與輸入的比值就是效率。", formula: R`\( \eta=\frac{E_{\text{有用}}}{E_{\text{輸入}}}\times100\% \)`, points: ["能量不會憑空消失", "轉換常伴隨熱與聲音損耗", "效率不會超過 100%", "標示能量流向可找出損耗"] },
      { id: "simple-machine-efficiency", title: "簡單機械的作功與效率", interactive: I, concept: "斜面、槓桿與滑輪能改變施力大小或方向，但輸入功仍至少等於有用輸出功。", formula: R`\( \eta=\frac{F_{\text{負載}}h}{F_{\text{施力}}s} \)`, points: ["理想機械只交換力與距離", "摩擦使輸入功增加", "效率描述能量利用程度", "可由量測的力與距離求效率"] },
      { id: "hydroelectric-power", title: "水力發電與功率", interactive: I, concept: "水流落差提供重力位能，通過渦輪轉成電能；流量與落差越大，理論可得功率越高。", formula: R`\( P=\rho gQh\eta \)`, points: ["落差提供每公斤水的能量", "流量代表每秒通過的水量", "渦輪與發電機有損耗", "水力發電受水文條件限制"] },
      { id: "wind-turbine", title: "風力發電與葉片掃掠面積", interactive: I, concept: "風機擷取流過葉片掃掠面積的動能；風速對功率的影響接近三次方。", formula: R`\( P\approx\tfrac12\rho Av^3\eta \)`, points: ["風速稍增可大幅提高功率", "葉片越長掃掠面積越大", "理論效率存在上限", "實際輸出需考量切入與停機風速"] }
    ],
    gravity: [
      { id: "cavendish-balance", title: "卡文迪西扭秤與萬有引力常數", interactive: I, concept: "兩個鉛球間極微弱的萬有引力會扭轉細線；量測角位移可反推重力常數的量級。", formula: R`\( F=G\frac{Mm}{r^2},\quad \tau=\kappa\theta \)`, points: ["實驗量到的是極微弱作用力", "距離平方反比很關鍵", "扭絲提供回復力矩", "G 可連結地球與天體尺度"] },
      { id: "planetary-weight", title: "不同星球的重量與質量", interactive: I, concept: "質量是物體本身的量，重量是重力造成的力；到不同星球時質量不變，重量隨重力加速度改變。", formula: R`\( W=mg \)`, points: ["公斤是質量單位", "牛頓是力的單位", "月球重力較小所以較輕", "慣性由質量決定而非重量"] },
      { id: "gravity-field-map", title: "萬有引力場與等位能線", interactive: I, concept: "引力場以向量表示受力方向與強弱，等位能線則連結位能相同的位置。", formula: R`\( g=\frac{GM}{r^2},\quad U=-\frac{GMm}{r} \)`, points: ["場線越密代表場越強", "引力方向指向質量中心", "等位能線與場線垂直", "靠近天體時位能更低"] }
    ],
    shm: [
      { id: "physical-pendulum", title: "物理擺與轉動慣量", interactive: I, concept: "剛體繞固定軸小角度擺動時，週期同時取決於轉動慣量、質量與質心到支點距離。", formula: R`\( T=2\pi\sqrt{\frac{I}{mgd}} \)`, points: ["質量分布影響週期", "不是所有擺都等同單擺", "小角度近似簡諧運動", "可用週期研究轉動慣量"] },
      { id: "torsion-pendulum", title: "扭擺與扭轉常數", interactive: I, concept: "物體扭轉細線後，回復力矩與轉角成正比，形成角度上的簡諧運動。", formula: R`\( \tau=-\kappa\theta,\quad T=2\pi\sqrt{\frac{I}{\kappa}} \)`, points: ["扭轉常數類似彈簧勁度", "轉動慣量越大週期越長", "角位移與回復力矩反向", "扭擺可量測材料性質"] },
      { id: "resonance-phase-lag", title: "受迫振動的相位差", interactive: I, concept: "外力頻率逐漸接近系統固有頻率時，振幅變大且位移相對驅動力的相位會快速改變。", formula: R`\( \tan\phi=\frac{2\beta\omega}{\omega_0^2-\omega^2} \)`, points: ["共振附近振幅最大", "低頻時近似同相", "高頻時近似反相", "阻尼會降低峰值並加寬共振"] }
    ],
    thermal: [
      { id: "density-lab", title: "密度量測與沉浮判斷", interactive: I, concept: "密度是質量除以體積；比較物體與液體密度即可預測下沉、懸浮或漂浮。", formula: R`\( \rho=\frac{m}{V} \)`, points: ["同體積時密度大者質量較大", "密度小於液體會漂浮", "密度相同可懸浮", "可用排水量測不規則體積"] },
      { id: "atmospheric-pressure", title: "大氣壓力與馬德堡半球", interactive: I, concept: "抽出兩半球間的空氣後，外界大氣壓力造成很大的合力，顯示空氣雖看不見仍有壓力。", formula: R`\( F=\Delta P\,A \)`, points: ["大氣壓隨高度上升而降低", "壓差作用於整個面積", "真空不是吸力而是壓差結果", "吸盤與注射器是應用"] },
      { id: "surface-tension", title: "液面張力與毛細現象", interactive: I, concept: "液體表面分子受力不均而像拉緊的薄膜；細管中液面上升或下降由表面張力與潤濕性決定。", formula: R`\( h=\frac{2\gamma\cos\theta}{\rho gr} \)`, points: ["細管越細毛細高度越大", "水潤濕玻璃會上升", "表面張力可支撐小物", "清潔劑會降低表面張力"] },
      { id: "calorimetry-mixing", title: "熱量計與混合水溫", interactive: I, concept: "熱水放熱與冷水吸熱在理想情況下相等；由平衡溫度可比較熱量與質量的關係。", formula: R`\( m_hc(T_h-T_f)=m_cc(T_f-T_c) \)`, points: ["熱量由高溫流向低溫", "平衡時溫度相同", "質量大的一方影響較明顯", "容器吸熱會造成誤差"] },
      { id: "greenhouse-radiation", title: "輻射平衡與溫室效應", interactive: I, concept: "地表吸收太陽短波後放出紅外線；溫室氣體增加會改變向外散熱效率，使平衡溫度上升。", formula: R`\( P_{\text{吸收}}=P_{\text{放射}},\quad P=\sigma AT^4 \)`, points: ["溫度由能量收支決定", "紅外線吸收會降低散熱", "這是簡化的輻射模型", "氣候還受雲、水氣與循環影響"] }
    ],
    waves: [
      { id: "string-wave-speed", title: "弦波速、張力與線密度", interactive: I, concept: "繩上的橫波速率由張力與每單位長度的質量決定；張力越大波走得越快。", formula: R`\( v=\sqrt{\frac{T}{\mu}} \)`, points: ["波速由介質性質決定", "張力增加使波速增加", "線密度增加使波速降低", "頻率與波長以 v=f\lambda 連結"] },
      { id: "sound-properties", title: "音調、響度與音色", interactive: I, concept: "聲音的頻率決定音調，振幅影響響度，波形中的泛音成分則形成不同音色。", formula: R`\( f=\frac{1}{T},\quad \beta=10\log_{10}(I/I_0) \)`, points: ["頻率高聽起來音調高", "振幅大通常較響", "相同音調可有不同音色", "人耳可聽範圍有限"] },
      { id: "echo-ultrasound", title: "回聲定位與超音波測距", interactive: I, concept: "發出脈衝後量測回波往返時間，利用聲速即可算出障礙物距離；超音波常用於測距與影像。", formula: R`\( d=\frac{vt}{2} \)`, points: ["除以二是因為聲波往返", "溫度會稍微改變聲速", "超音波頻率高於聽覺範圍", "蝙蝠與聲納都用回聲定位"] },
      { id: "seismic-waves", title: "地震波與防震隔離", interactive: I, concept: "地震振動經由地面傳到建築；基礎隔震把系統固有頻率調低，可減少建築共振反應。", formula: R`\( a_{\text{反應}}\propto\frac{1}{|\omega_0^2-\omega^2|} \)`, points: ["P 波與 S 波傳播方式不同", "共振會放大搖晃", "隔震延長結構週期", "阻尼器可耗散振動能量"] }
    ],
    optics: [
      { id: "shadow-pinhole", title: "光的直線傳播與針孔成像", interactive: I, concept: "光沿直線前進會形成影子；針孔讓不同方向的光在光屏上交叉，形成倒立的實像。", formula: R`\( \frac{h_i}{h_o}=\frac{d_i}{d_o} \)`, points: ["影子的邊界反映光直線傳播", "針孔像倒立", "螢幕距離影響像大小", "孔太大會模糊、太小會變暗"] },
      { id: "rgb-color-mixing", title: "色光三原色與顯示器混色", interactive: I, concept: "紅、綠、藍三色光以加法混色產生其他顏色；手機與螢幕以微小 RGB 子像素調出色彩。", formula: R`\( \vec C=R\vec r+G\vec g+B\vec b \)`, points: ["紅加綠接近黃光", "三色全強接近白光", "色光混色不同於顏料", "顯示器以 RGB 控制像素"] },
      { id: "fiber-optics", title: "光纖傳輸與彎曲損耗", interactive: I, concept: "光纖靠核心與包層間的全反射導光；彎曲太急會讓部分光漏出，降低傳輸強度。", formula: R`\( I=I_0e^{-\alpha L} \)`, points: ["核心折射率高於包層", "全反射限制光路", "彎曲半徑太小會增加損耗", "光纖可高速傳遞資訊"] },
      { id: "human-eye", title: "眼睛調焦與視力矯正", interactive: I, concept: "眼睛藉由水晶體改變焦距，讓物體成像在視網膜；近視以凹透鏡、遠視以凸透鏡矯正。", formula: R`\( \frac{1}{f}=\frac{1}{d_o}+\frac{1}{d_i} \)`, points: ["正常眼像落在視網膜", "近視焦點在視網膜前", "遠視焦點在視網膜後", "配鏡改變等效焦距"] },
      { id: "camera-exposure", title: "相機曝光、光圈與快門", interactive: I, concept: "相機以光圈控制通光量、以快門控制曝光時間；兩者組合決定感光面的總曝光量。", formula: R`\( E\propto\frac{t}{N^2} \)`, points: ["光圈數越小開口越大", "快門越久曝光越多", "高快門可凝結動作", "曝光需兼顧亮度與景深"] }
    ],
    electric: [
      { id: "electrostatic-induction", title: "靜電感應與驗電器", interactive: I, concept: "帶電物靠近導體會使自由電荷重新分布，沒有接觸也能造成電荷分離與驗電器金屬葉張開。", formula: R`\( F=k\frac{|q_1q_2|}{r^2} \)`, points: ["感應不一定有電荷轉移", "異號電荷靠近", "接地可留下淨電荷", "驗電器用葉片張開顯示帶電"] },
      { id: "electric-heating", title: "焦耳熱與電器功率", interactive: I, concept: "電流通過電阻會把電能轉為內能；比較不同電壓與電阻，判讀電器加熱功率。", formula: R`\( P=IV=\frac{V^2}{R}=I^2R \)`, points: ["功率代表每秒轉換能量", "電阻絲適合發熱", "同電壓下電阻小電流大", "電費以度數計算電能"] },
      { id: "household-circuit", title: "家庭電路、保險絲與漏電斷路器", interactive: I, concept: "家電採並聯才能各自工作；總電流超過保護裝置額定值時，保險絲或斷路器會切斷電路。", formula: R`\( P_{\text{總}}=\sum P_i,\quad I=\frac{P}{V} \)`, points: ["並聯各支路電壓相同", "同時開多台高功率電器會過載", "保護裝置串聯在火線", "接地與漏電斷路器提升安全"] },
      { id: "rlc-resonance", title: "RLC 串聯共振與相位", interactive: I, concept: "交流電路中的電感與電容在特定頻率互相抵銷電抗，使電流最大；頻率兩側的電壓與電流相位不同。", formula: R`\( f_0=\frac{1}{2\pi\sqrt{LC}} \)`, points: ["共振時感抗等於容抗", "串聯電流在共振時最大", "電阻決定峰值寬度", "收音機可用共振選台"] }
    ],
    magnetism: [
      { id: "compass-field", title: "指南針與地磁場", interactive: I, concept: "指南針磁針會沿合磁場方向轉動；附近磁鐵或通電導線可改變指向。", formula: R`\( \vec B_{\text{合}}=\vec B_{\text{地}}+\vec B_{\text{外}} \)`, points: ["磁針北端指向磁場方向", "地磁場提供背景方向", "靠近磁鐵偏轉較大", "羅盤需遠離鐵磁性物品"] },
      { id: "electromagnet", title: "電磁鐵與線圈磁場", interactive: I, concept: "通電線圈的磁場會隨電流與匝數增加而增強；加入鐵芯可大幅集中磁場。", formula: R`\( B\approx\mu\frac{NI}{\ell} \)`, points: ["電流方向決定磁極", "匝數越多磁場越強", "鐵芯提高磁導率", "電鈴與繼電器都用電磁鐵"] },
      { id: "dc-motor", title: "直流馬達與換向器", interactive: I, concept: "通電線圈在磁場中受力矩而轉動；換向器在半圈後反轉電流，讓力矩維持同一轉向。", formula: R`\( \tau=NIAB\sin\theta \)`, points: ["線圈兩側受方向相反的安培力", "力偶形成轉動力矩", "換向器讓馬達持續轉動", "負載增加時轉速下降"] }
    ],
    modern: [
      { id: "cathode-ray-em", title: "陰極射線管與電子比電荷", interactive: I, concept: "電子先經電壓加速，再受磁場偏轉成圓弧；由半徑、磁場與加速電壓可估算電子的比電荷。", formula: R`\( \frac{e}{m}=\frac{2V}{B^2r^2} \)`, points: ["磁力提供向心力", "偏轉半徑可量測", "e/m 是電子的重要常數", "陰極射線證明電子帶負電"] },
      { id: "spectroscopy", title: "發射光譜與元素指紋", interactive: I, concept: "原子中的電子在能階間躍遷時只能放出特定波長，形成每種元素獨特的線光譜。", formula: R`\( \Delta E=hf=\frac{hc}{\lambda} \)`, points: ["能階是離散的", "每條譜線對應一個能階差", "光譜可辨識元素", "天文學可用光譜分析恆星"] },
      { id: "solar-cell", title: "太陽能電池與光伏轉換", interactive: I, concept: "半導體吸收光子後產生電子與電洞，內建電場將它們分離而輸出電能；照度與面積影響輸出。", formula: R`\( P_{\text{out}}=IA\eta \)`, points: ["光子能量需跨過能隙", "照度提高通常增加電流", "面積越大輸出越大", "效率受材料與溫度影響"] }
    ]
  };

  C.modules.forEach(module => module.experiments.push(...(ADDITIONS[module.id] || [])));
  C.totalExperiments = C.modules.reduce((total, module) => total + module.experiments.length, 0);
  C.totalInteractive = C.modules.reduce((total, module) => total + module.experiments.filter(experiment => experiment.interactive).length, 0);
})();
