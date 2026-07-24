/*
 * curriculum.js
 * 台灣高中物理實驗室 — 課程結構資料
 * 依教育部 108 課綱「自然科學領域—物理」規劃，涵蓋必修物理與選修物理（加深加廣）。
 * 公式以 LaTeX 撰寫（String.raw 保留反斜線），由 MathJax 排版。
 * 本檔為原創教材資料。
 */
(function () {
  "use strict";
  const R = String.raw;

  const MODULES = [
    {
      no: "一", id: "kinematics", title: "運動學", track: "必修 · 選修", color: "#4dd0e1",
      intro: "描述物體如何運動——位置、位移、速度與加速度，以及等加速度運動與拋體運動。",
      experiments: [
        { id: "projectile", title: "拋體運動", interactive: true,
          concept: "拋體同時進行水平等速度與鉛直等加速度運動；水平與鉛直方向彼此獨立。",
          formula: R`\( x = v_0\cos\theta\,t,\quad y = v_0\sin\theta\,t - \tfrac{1}{2}gt^2,\quad R = \dfrac{v_0^2\sin 2\theta}{g} \)`,
          points: ["水平方向不受力，速度分量固定", "鉛直方向為自由落體，加速度 g 向下", "45° 發射角在平地上射程最遠", "軌跡為拋物線"] },
        { title: "等加速度直線運動", interactive: false,
          concept: "加速度固定時，速度隨時間線性變化，位移為 v-t 圖下的面積。",
          formula: R`\( v = v_0 + at,\quad s = v_0 t + \tfrac{1}{2}at^2,\quad v^2 = v_0^2 + 2as \)`,
          points: ["v-t 圖斜率為加速度", "v-t 圖面積為位移", "三大等加速度運動公式"] },
        { id: "freefall", title: "自由落體", interactive: true,
          concept: "只受重力作用的落體運動，是等加速度運動的特例（a = g）；落地時間與速率只與高度和 g 有關。",
          formula: R`\( v = gt,\quad h = \tfrac{1}{2}gt^2,\quad v = \sqrt{2gh},\quad g \approx 9.8\ \mathrm{m/s^2} \)`,
          points: ["初速為零時由靜止落下", "落地速率與 √高度 成正比", "與物體質量無關", "v-t 圖為通過原點的直線"] },
        { title: "相對運動與參考系", interactive: false,
          concept: "速度會隨觀察者所在參考系而不同，可用向量相加求相對速度。",
          formula: R`\( \vec{v}_{A/B} = \vec{v}_{A} - \vec{v}_{B} \)`,
          points: ["選定參考系是描述運動的前提", "相對速度為向量差", "常見於過河、飛機遇風問題"] },
        { title: "二維運動的分量分析", interactive: false,
          concept: "任何平面運動都可拆解為互相垂直的兩個一維運動分量。",
          formula: R`\( v = \sqrt{v_x^2 + v_y^2},\quad \tan\theta = \dfrac{v_y}{v_x} \)`,
          points: ["向量可正交分解", "各分量獨立處理", "再用畢氏定理合成"] }
      ]
    },
    {
      no: "二", id: "newton", title: "牛頓運動定律與力", track: "必修 · 選修", color: "#ff8a65",
      intro: "力如何改變運動狀態——慣性、F = ma、作用與反作用，以及斜面、摩擦與張力問題。",
      experiments: [
        { id: "incline", title: "斜面上的物體受力", interactive: true,
          concept: "斜面上的物體受重力、正向力與摩擦力；將重力沿斜面與垂直斜面分解可求加速度。",
          formula: R`\( mg\sin\theta - \mu mg\cos\theta = ma,\quad N = mg\cos\theta \)`,
          points: ["重力分解為 mg·sinθ 與 mg·cosθ", "靜摩擦力最大值 = μₛN", "θ 增大時下滑加速度增大", "μ 大於 tanθ 時物體靜止"] },
        { title: "牛頓第二運動定律 F = ma", interactive: false,
          concept: "物體的加速度與合力成正比、與質量成反比，方向與合力相同。",
          formula: R`\( \sum \vec{F} = m\vec{a} \)`,
          points: ["合力決定加速度", "質量是慣性的量度", "單位：1 N = 1 kg·m/s²"] },
        { title: "牛頓第三運動定律", interactive: false,
          concept: "作用力與反作用力大小相等、方向相反，且作用在不同物體上。",
          formula: R`\( \vec{F}_{AB} = -\vec{F}_{BA} \)`,
          points: ["成對出現", "作用在不同物體，不會抵消", "與物體質量無關"] },
        { title: "摩擦力", interactive: false,
          concept: "接觸面間阻礙相對運動的力，分為靜摩擦與動摩擦。",
          formula: R`\( f_s \le \mu_s N,\quad f_k = \mu_k N \)`,
          points: ["靜摩擦可變，有最大值", "動摩擦近似定值", "μ 與接觸面性質有關"] },
        { title: "連接體與張力", interactive: false,
          concept: "以繩連接的系統可視為整體求加速度，再對個別物體求繩張力。",
          formula: R`\( a = \dfrac{\sum F_{ext}}{\sum m},\quad a_{\text{阿特午}} = \dfrac{(m_1-m_2)g}{m_1+m_2} \)`,
          points: ["整體法求加速度", "隔離法求內力", "理想繩張力處處相等"] }
      ]
    },
    {
      no: "三", id: "momentum", title: "動量與碰撞", track: "選修", color: "#ba68c8",
      intro: "動量、衝量與碰撞——在沒有外力時，系統總動量守恆。",
      experiments: [
        { id: "collision", title: "一維碰撞", interactive: true,
          concept: "兩物體碰撞時系統總動量守恆；彈性碰撞另滿足動能守恆，非彈性碰撞則有動能損失。",
          formula: R`\( m_1u_1 + m_2u_2 = m_1v_1 + m_2v_2,\quad e = \dfrac{v_2-v_1}{u_1-u_2} \)`,
          points: ["動量恆守恆", "彈性碰撞動能不變", "完全非彈性碰撞後合為一體", "回復係數 e 介於 0 與 1"] },
        { title: "動量守恆定律", interactive: false,
          concept: "系統不受外力（或外力和為零）時，總動量保持不變。",
          formula: R`\( \sum \vec{p} = \text{定值} \)`,
          points: ["源自牛頓第三定律", "向量式守恆", "適用爆炸、碰撞、反衝"] },
        { title: "衝量與動量定理", interactive: false,
          concept: "力對時間的累積（衝量）等於動量的變化量。",
          formula: R`\( \vec{J} = \int \vec{F}\,dt = \Delta \vec{p} \)`,
          points: ["衝量為力-時間圖面積", "延長作用時間可減小衝擊力", "安全氣囊的原理"] },
        { title: "彈性與非彈性碰撞", interactive: false,
          concept: "以動能是否守恆區分碰撞類型。",
          formula: R`\( e = \dfrac{v_2 - v_1}{u_1 - u_2} \)`,
          points: ["e = 1 為完全彈性", "e = 0 為完全非彈性", "0 < e < 1 為一般碰撞"] },
        { title: "反衝與爆炸", interactive: false,
          concept: "靜止系統分裂時，各部分動量大小相等、方向相反。",
          formula: R`\( 0 = m_1v_1 + m_2v_2 \)`,
          points: ["火箭推進原理", "槍枝後座力", "總動量仍為零"] }
      ]
    },
    {
      no: "四", id: "energy", title: "功與能量", track: "必修 · 選修", color: "#81c784",
      intro: "功、動能與位能——力學能守恆，以及功率與保守力的概念。",
      experiments: [
        { id: "energy-track", title: "軌道上的能量守恆", interactive: true,
          concept: "無摩擦軌道上，物體的動能與重力位能可互相轉換，但力學能總和保持不變。",
          formula: R`\( E = K + U = \tfrac{1}{2}mv^2 + mgh = \text{定值} \)`,
          points: ["最高點位能最大、動能最小", "最低點動能最大", "有摩擦時力學能轉為熱能", "能量守恆是核心概念"] },
        { title: "功與功率", interactive: false,
          concept: "力沿位移方向所做的功，以及做功的快慢（功率）。",
          formula: R`\( W = Fs\cos\theta,\quad P = \dfrac{W}{t} = Fv \)`,
          points: ["功是純量", "垂直方向的力不做功", "1 W = 1 J/s"] },
        { title: "功能定理", interactive: false,
          concept: "合力對物體所做的淨功等於其動能的變化。",
          formula: R`\( W_{net} = \Delta K = \tfrac{1}{2}mv^2 - \tfrac{1}{2}mv_0^2 \)`,
          points: ["淨功改變動能", "連結力與運動", "適用變力問題"] },
        { title: "重力位能與彈性位能", interactive: false,
          concept: "物體因位置或形變而儲存的能量。",
          formula: R`\( U_g = mgh,\quad U_s = \tfrac{1}{2}kx^2 \)`,
          points: ["位能與參考點有關", "彈簧位能與形變平方成正比", "為保守力位能"] },
        { title: "保守力與非保守力", interactive: false,
          concept: "保守力做功與路徑無關；非保守力（如摩擦）會消耗力學能。",
          formula: R`\( W_{\text{保守}} = -\Delta U \)`,
          points: ["重力、彈力為保守力", "摩擦力為非保守力", "非保守力使力學能不守恆"] }
      ]
    },
    {
      no: "五", id: "gravity", title: "圓周運動與萬有引力", track: "必修 · 選修", color: "#ffd54f",
      intro: "等速圓周運動與向心力，牛頓萬有引力與克卜勒行星運動定律。",
      experiments: [
        { id: "orbit", title: "行星軌道與克卜勒定律", interactive: true,
          concept: "行星在萬有引力作用下繞恆星運行；軌道為橢圓，且掃過的面積速率固定。",
          formula: R`\( F = \dfrac{GMm}{r^2},\quad T^2 \propto a^3 \)`,
          points: ["軌道為橢圓，恆星在焦點", "近日點速度較快（等面積律）", "週期平方與半長軸立方成正比", "向心力由萬有引力提供"] },
        { id: "circular", title: "等速圓周運動與向心力", interactive: true,
          concept: "沿圓周等速率運動時，加速度指向圓心，由向心力提供；速率不變但速度方向持續改變。",
          formula: R`\( a_c = \dfrac{v^2}{r} = \omega^2 r,\quad F_c = \dfrac{mv^2}{r},\quad T = \dfrac{2\pi r}{v} \)`,
          points: ["速率不變但速度方向改變", "向心力指向圓心", "向心加速度與 v² 成正比", "半徑越大所需向心力越小（同速率）"] },
        { title: "萬有引力定律", interactive: false,
          concept: "任兩質點間相互吸引，力與質量乘積成正比、與距離平方成反比。",
          formula: R`\( F = G\dfrac{m_1 m_2}{r^2},\quad G = 6.67\times10^{-11}\ \mathrm{N\cdot m^2/kg^2} \)`,
          points: ["平方反比定律", "解釋重力與天體運動", "g = GM / R²"] },
        { title: "人造衛星與脫離速度", interactive: false,
          concept: "衛星以萬有引力為向心力繞行；達到脫離速度即可擺脫引力束縛。",
          formula: R`\( v_{\text{軌道}} = \sqrt{\dfrac{GM}{r}},\quad v_{\text{脫離}} = \sqrt{\dfrac{2GM}{R}} \)`,
          points: ["近地軌道速度約 7.9 km/s", "脫離速度約 11.2 km/s", "同步衛星週期為 24 小時"] },
        { title: "角動量守恆", interactive: false,
          concept: "無外力矩時，系統角動量保持不變，解釋行星等面積律。",
          formula: R`\( L = mvr = \text{定值} \)`,
          points: ["等面積律的本質", "半徑縮小則轉速增快", "花式溜冰收手加速"] }
      ]
    },
    {
      no: "六", id: "shm", title: "簡諧運動", track: "選修", color: "#4fc3f7",
      intro: "彈簧振子與單擺——回復力與位移成正比的週期性運動。",
      experiments: [
        { id: "spring", title: "彈簧振子", interactive: true,
          concept: "彈簧的回復力與位移成正比且方向相反，使物體作簡諧運動；動能與彈性位能週期性互換。",
          formula: R`\( F = -kx,\quad T = 2\pi\sqrt{\dfrac{m}{k}},\quad x = A\cos(\omega t) \)`,
          points: ["回復力 F = −kx", "週期與振幅無關", "平衡點速度最大", "端點加速度最大"] },
        { id: "pendulum", title: "單擺", interactive: true,
          concept: "小角度擺動時，單擺近似為簡諧運動，週期只與擺長和重力有關，與擺錘質量、振幅無關。",
          formula: R`\( T = 2\pi\sqrt{\dfrac{L}{g}},\quad \theta = \theta_0\cos(\omega t) \)`,
          points: ["需小角度近似（< 10°）", "週期與擺錘質量無關", "擺長越長週期越長", "可用來測量 g"] },
        { title: "簡諧運動的位移-時間關係", interactive: false,
          concept: "位移隨時間呈正弦（或餘弦）變化，速度與加速度亦為正弦函數。",
          formula: R`\( x = A\cos(\omega t + \varphi),\quad v = -A\omega\sin(\omega t),\quad a = -\omega^2 x \)`,
          points: ["ω = 2π/T 為角頻率", "加速度與位移成正比反向", "相位差描述超前落後"] },
        { title: "簡諧運動的能量", interactive: false,
          concept: "簡諧運動中總力學能守恆，動能與位能隨位置交替變化。",
          formula: R`\( E = \tfrac{1}{2}kA^2,\quad K = \tfrac{1}{2}k(A^2 - x^2) \)`,
          points: ["總能與振幅平方成正比", "平衡點動能最大", "端點位能最大"] },
        { title: "共振", interactive: false,
          concept: "外力頻率接近系統自然頻率時，振幅急遽增大。",
          formula: R`\( f_{\text{驅動}} \approx f_0 \)`,
          points: ["能量最有效傳遞", "橋樑共振破壞", "樂器與收音機選台"] }
      ]
    },
    {
      no: "七", id: "thermal", title: "流體與熱學", track: "選修", color: "#e57373",
      intro: "浮力與白努利原理，理想氣體與分子動能論，以及熱力學基本定律。",
      experiments: [
        { id: "gas", title: "理想氣體與分子動能論", interactive: true,
          concept: "氣體由大量作隨機運動的分子組成；溫度反映分子平均動能，分子撞擊器壁形成壓力。",
          formula: R`\( PV = nRT,\quad \tfrac{1}{2}m\langle v^2\rangle = \tfrac{3}{2}kT \)`,
          points: ["溫度越高分子平均速率越大", "壓力來自分子碰撞", "PV = nRT 理想氣體方程", "體積縮小則壓力增大"] },
        { id: "buoyancy", title: "浮力與阿基米德原理", interactive: true,
          concept: "浸在流體中的物體受到向上的浮力，大小等於排開流體的重量；物體密度小於流體則浮起。",
          formula: R`\( F_b = \rho_{\text{流}}\,g\,V_{\text{排}},\quad \dfrac{V_{\text{沒入}}}{V} = \dfrac{\rho_{\text{物}}}{\rho_{\text{流}}} \)`,
          points: ["浮力等於排開流體重量", "沉浮取決於密度比較", "沒入比例 = 密度比", "潛水艇與熱氣球原理"] },
        { title: "白努利原理", interactive: false,
          concept: "理想流體流速快處壓力小，源自能量守恆。",
          formula: R`\( P + \tfrac{1}{2}\rho v^2 + \rho gh = \text{定值} \)`,
          points: ["流速快壓力低", "機翼升力來源", "文氏管與噴霧器"] },
        { title: "熱力學第一定律", interactive: false,
          concept: "系統內能變化等於吸收的熱量減去對外所做的功，是能量守恆的表現。",
          formula: R`\( \Delta U = Q - W \)`,
          points: ["內能為狀態函數", "熱與功皆為能量傳遞", "等溫、絕熱等過程分析"] },
        { title: "理想氣體方程式", interactive: false,
          concept: "描述理想氣體壓力、體積、溫度與莫耳數關係的狀態方程。",
          formula: R`\( PV = nRT,\quad R = 8.31\ \mathrm{J/(mol\cdot K)} \)`,
          points: ["波以耳定律 PV 定值", "查理定律 V∝T", "亞佛加厥定律"] }
      ]
    },
    {
      no: "八", id: "waves", title: "波動與聲音", track: "必修 · 選修", color: "#7986cb",
      intro: "橫波與縱波的性質、波的疊加與干涉、駐波、都卜勒效應與聲音的共鳴。",
      experiments: [
        { id: "standing-wave", title: "弦上的駐波", interactive: true,
          concept: "兩列同頻率、反向前進的波疊加形成駐波；弦上只能存在特定的共振頻率（諧波）。",
          formula: R`\( L = n\dfrac{\lambda}{2},\quad f_n = \dfrac{nv}{2L},\quad n = 1,2,3\ldots \)`,
          points: ["波節不動、波腹振幅最大", "只有特定頻率能共振", "n = 1 為基頻", "頻率為基頻整數倍"] },
        { title: "橫波與縱波", interactive: false,
          concept: "介質振動方向與波前進方向垂直者為橫波，平行者為縱波。",
          formula: R`\( v = f\lambda \)`,
          points: ["繩波為橫波", "聲波為縱波", "波速由介質決定"] },
        { id: "superposition", title: "波的疊加與干涉", interactive: true,
          concept: "兩波相遇時位移相加；相位相同則相長，相反則相消；頻率略異時產生拍。",
          formula: R`\( \text{相長：}\Delta = n\lambda,\quad \text{相消：}\Delta = (n+\tfrac{1}{2})\lambda \)`,
          points: ["重疊原理", "相長與相消干涉", "水波槽實驗"] },
        { id: "doppler", title: "都卜勒效應", interactive: true,
          concept: "波源與觀察者相對運動時，觀察到的頻率發生改變；接近時變高、遠離時變低。",
          formula: R`\( f' = f\,\dfrac{v \pm v_o}{v \mp v_s} \)`,
          points: ["接近時頻率升高", "遠離時頻率降低", "波源前方波長被壓縮", "測速與天文紅移"] },
        { title: "聲音的共鳴", interactive: false,
          concept: "空氣柱在特定長度時與音叉產生共鳴，可測聲速。",
          formula: R`\( \text{開管 } f_n = \dfrac{nv}{2L},\quad \text{閉管 } f_n = \dfrac{(2n-1)v}{4L} \)`,
          points: ["共鳴管實驗", "開管與閉管諧波不同", "樂器發聲原理"] }
      ]
    },
    {
      no: "九", id: "optics", title: "光學", track: "必修 · 選修", color: "#f06292",
      intro: "光的反射與折射、面鏡與透鏡成像、干涉、繞射與偏振等波動性質。",
      experiments: [
        { id: "double-slit", title: "雙縫干涉", interactive: true,
          concept: "同調光通過雙狹縫後在屏幕上形成明暗相間的干涉條紋，證明光具有波動性。",
          formula: R`\( d\sin\theta = m\lambda,\quad \Delta y = \dfrac{\lambda L}{d} \)`,
          points: ["亮紋：路程差為 λ 整數倍", "縫距越小條紋越寬", "波長越長條紋越寬", "楊氏實驗證明光的波動性"] },
        { id: "snell", title: "反射與折射（司乃耳定律）", interactive: true,
          concept: "光由一介質進入另一介質時偏折，入射角與折射角遵循司乃耳定律；由密到疏且超過臨界角時發生全反射。",
          formula: R`\( n_1\sin\theta_1 = n_2\sin\theta_2,\quad \theta_c = \sin^{-1}\!\dfrac{n_2}{n_1} \)`,
          points: ["反射角等於入射角", "折射率決定偏折量", "由疏入密偏向法線", "全反射與臨界角"] },
        { id: "mirror", title: "面鏡成像", interactive: true,
          concept: "凹面鏡與凸面鏡依物距形成不同性質的像；可用主要光線作圖找像。",
          formula: R`\( \dfrac{1}{f} = \dfrac{1}{p} + \dfrac{1}{q},\quad m = -\dfrac{q}{p} \)`,
          points: ["凹面鏡可成實像或虛像", "凸面鏡恆成縮小虛像", "焦距 f = R/2"] },
        { id: "lens", title: "透鏡成像", interactive: true,
          concept: "凸透鏡與凹透鏡依物距形成不同的像；用三條主要光線可作圖找像的位置與性質。",
          formula: R`\( \dfrac{1}{f} = \dfrac{1}{p} + \dfrac{1}{q},\quad m = -\dfrac{q}{p} \)`,
          points: ["凸透鏡會聚光線", "凹透鏡發散光線", "物在二倍焦距外成縮小倒立實像", "近視與遠視矯正"] },
        { title: "單狹縫繞射與偏振", interactive: false,
          concept: "光通過狹縫會繞射展開；偏振顯示光為橫波。",
          formula: R`\( a\sin\theta = m\lambda \)`,
          points: ["繞射使光偏離直線", "中央亮紋最寬最亮", "偏振片證明光為橫波"] }
      ]
    },
    {
      no: "十", id: "electric", title: "電場與電路", track: "必修 · 選修", color: "#4db6ac",
      intro: "庫侖定律、電場與電位、電容器，以及歐姆定律與電路分析。",
      experiments: [
        { id: "efield", title: "電場線與等勢面", interactive: true,
          concept: "電荷在周圍空間產生電場，以電場線表示方向與強弱；與電場線垂直者為等勢面。",
          formula: R`\( E = \dfrac{kQ}{r^2},\quad V = \dfrac{kQ}{r},\quad k = 9\times10^{9} \)`,
          points: ["電場線由正電荷指向負電荷", "電場線密處場強大", "等勢面與電場線垂直", "沿等勢面移動不做功"] },
        { title: "庫侖定律", interactive: false,
          concept: "兩點電荷間的靜電力與電量乘積成正比、與距離平方成反比。",
          formula: R`\( F = k\dfrac{q_1 q_2}{r^2} \)`,
          points: ["同性相斥異性相吸", "平方反比定律", "與萬有引力形式相同"] },
        { title: "電位與電位能", interactive: false,
          concept: "單位電荷在電場中所具有的位能，是純量。",
          formula: R`\( V = \dfrac{U}{q},\quad U = qV \)`,
          points: ["電位差驅動電流", "沿電場方向電位下降", "單位為伏特"] },
        { id: "ohms", title: "歐姆定律與電路", interactive: true,
          concept: "導體兩端電壓與電流成正比，比值為電阻；串聯電阻相加，並聯電阻倒數相加。",
          formula: R`\( V = IR,\quad R_s = \sum R_i,\quad \dfrac{1}{R_p} = \sum \dfrac{1}{R_i},\quad P = IV \)`,
          points: ["電阻阻礙電流", "串聯分壓、並聯分流", "並聯總電阻比任一支路小", "功率 P = IV = I²R"] },
        { title: "電容器", interactive: false,
          concept: "儲存電荷與電能的元件，電容與電量、電壓有關。",
          formula: R`\( C = \dfrac{Q}{V},\quad U = \tfrac{1}{2}CV^2,\quad C = \dfrac{\varepsilon A}{d} \)`,
          points: ["平行板電容器", "儲存電能", "充放電特性"] }
      ]
    },
    {
      no: "十一", id: "magnetism", title: "磁場與電磁感應", track: "必修 · 選修", color: "#9575cd",
      intro: "磁場與勞侖茲力、電流的磁效應、法拉第電磁感應與楞次定律，以及交流電與電磁波。",
      experiments: [
        { id: "induction", title: "電磁感應（法拉第定律）", interactive: true,
          concept: "磁鐵與線圈相對運動使通過線圈的磁通量改變，感應出電動勢與電流；感應電流方向由楞次定律決定。",
          formula: R`\( \varepsilon = -N\dfrac{\Delta\Phi}{\Delta t},\quad \Phi = BA\cos\theta \)`,
          points: ["磁通量變化才有感應電流", "運動越快感應電動勢越大", "楞次定律：感應電流反抗變化", "發電機的基本原理"] },
        { id: "lorentz", title: "磁場與勞侖茲力", interactive: true,
          concept: "運動電荷在磁場中受力，方向由右手定則決定；力恆垂直於速度，使帶電粒子作等速率圓周運動。",
          formula: R`\( F = qvB\sin\theta,\quad r = \dfrac{mv}{qB},\quad T = \dfrac{2\pi m}{qB} \)`,
          points: ["力垂直於速度與磁場", "帶電粒子作圓周運動", "半徑與動量成正比", "週期與速率無關"] },
        { title: "載流導線的磁場", interactive: false,
          concept: "電流會在周圍產生磁場，方向由安培右手定則決定。",
          formula: R`\( \text{直線 } B = \dfrac{\mu_0 I}{2\pi r},\quad \text{螺線管 } B = \mu_0 n I \)`,
          points: ["電流磁效應", "安培右手定則", "電磁鐵原理"] },
        { title: "楞次定律", interactive: false,
          concept: "感應電流的磁場總是反抗原磁通量的變化，體現能量守恆。",
          formula: R`\( \varepsilon = -N\dfrac{d\Phi}{dt} \)`,
          points: ["反抗磁通變化", "能量守恆的展現", "電磁煞車應用"] },
        { id: "ac", title: "交流電與電磁波", interactive: true,
          concept: "線圈在磁場中轉動使磁通量週期變化，感應出正弦式交流電動勢。",
          formula: R`\( V = V_0\sin(\omega t),\quad c = f\lambda = 3\times10^{8}\ \mathrm{m/s} \)`,
          points: ["交流電週期變化", "變壓器改變電壓", "電磁波不需介質傳播"] }
      ]
    },
    {
      no: "十二", id: "modern", title: "近代物理與宇宙學", track: "必修 · 選修", color: "#ffb74d",
      intro: "光電效應、原子模型、物質波、相對論、原子核，以及大霹靂與宇宙膨脹。",
      experiments: [
        { id: "photoelectric", title: "光電效應", interactive: true,
          concept: "光照射金屬時若頻率足夠高即射出電子；光以光子形式攜帶能量，證明光的粒子性。",
          formula: R`\( E = hf,\quad hf = W + K_{max},\quad K_{max} = hf - W \)`,
          points: ["需超過底限頻率才有電子", "增加光強只增加電子數", "光子能量與頻率成正比", "愛因斯坦以此獲諾貝爾獎"] },
        { id: "bohr", title: "波耳原子模型與原子光譜", interactive: true,
          concept: "電子只能在特定能階運行，躍遷時吸收或放出特定頻率的光，形成不連續的原子光譜。",
          formula: R`\( E_n = -\dfrac{13.6}{n^2}\ \mathrm{eV},\quad \Delta E = hf = \dfrac{1240}{\lambda\,[\mathrm{nm}]} \)`,
          points: ["能階量子化", "躍遷放出特定波長的光", "萊曼系（紫外）、巴耳末系（可見）", "解釋氫原子光譜"] },
        { title: "物質波（德布羅意）", interactive: false,
          concept: "運動的粒子也具有波動性，波長與動量成反比。",
          formula: R`\( \lambda = \dfrac{h}{p} = \dfrac{h}{mv} \)`,
          points: ["波粒二象性", "電子繞射實驗證實", "電子顯微鏡原理"] },
        { id: "relativity", title: "狹義相對論", interactive: true,
          concept: "接近光速時時間膨脹、長度收縮；用光鐘可看出運動時鐘走得較慢。",
          formula: R`\( E = mc^2,\quad t = \dfrac{t_0}{\sqrt{1 - v^2/c^2}} \)`,
          points: ["光速為恆定上限", "時間膨脹與長度收縮", "質能等價"] },
        { id: "halflife", title: "原子核與放射性", interactive: true,
          concept: "不穩定原子核會放出 α、β、γ 射線而衰變，每經一個半衰期數量減半。",
          formula: R`\( N = N_0\left(\tfrac{1}{2}\right)^{t/T_{1/2}} \)`,
          points: ["三種放射線性質不同", "半衰期為統計特性", "碳-14 定年法"] },
        { title: "大霹靂與哈伯定律", interactive: false,
          concept: "宇宙起源於大霹靂並持續膨脹，遠方星系退行速度與距離成正比。",
          formula: R`\( v = H_0 d \)`,
          points: ["宇宙膨脹", "紅移現象", "宇宙微波背景輻射"] }
      ]
    }
  ];

  let expCount = 0, interactiveCount = 0;
  MODULES.forEach(m => m.experiments.forEach(e => { expCount++; if (e.interactive) interactiveCount++; }));

  window.PhysicsLabCurriculum = {
    modules: MODULES,
    totalModules: MODULES.length,
    totalExperiments: expCount,
    totalInteractive: interactiveCount
  };
})();
