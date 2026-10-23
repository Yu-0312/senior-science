/*
 * exam-curriculum.js — 學測／分科常考與國中銜接實驗（2026-10）
 *
 * 來源：課本各冊的學生實驗（例如選修物理III 水波槽、選修物理IV 等位線與電場）、
 * 必修物理的天體運動、原子結構、物質波、質能守恆，以及國中自然銜接高中必修的主題
 * （平面鏡成像、聲音需要介質、四行程引擎、摩擦起電）。
 *
 * 每一筆多了 exam 欄位：
 *   tag  這個實驗對應的課本位置或考試範圍，顯示在實驗頁標題上方
 *   how  題目通常怎麼問——學生做完實驗後最該帶走的那一句
 */
(function () {
  "use strict";
  const C = window.PhysicsLabCurriculum;
  if (!C || !C.extendCatalog) return;
  const R = String.raw;

  C.extendCatalog("exam-bridge-labs-2026-10", {
    gravity: [
      {
        id: "kepler-orbits", title: "克卜勒三大定律與橢圓軌道",
        concept: "行星沿橢圓繞太陽運行，太陽在其中一個焦點上。離太陽近時走得快、遠時走得慢，但連線在相等時間內掃過的面積相同——這正是角動量守恆。軌道越大，週期越長，T² 與半長軸 a³ 成正比。",
        formula: R`\( \dfrac{\Delta A}{\Delta t}=\dfrac{L}{2m}=\text{定值},\qquad \dfrac{T^2}{a^3}=\dfrac{4\pi^2}{GM} \)`,
        points: ["太陽在橢圓的焦點，不在中心", "近日點速率最大、遠日點最小", "等時間掃過等面積＝角動量守恆", "T² ∝ a³，比值只由中心天體質量決定"],
        exam: { tag: "必修物理 2-4 天體運動 · 選修物理I 第 6 章", how: "給近日距與遠日距求速率比（r₁v₁ = r₂v₂），或用 T² ∝ a³ 比較兩顆行星的週期。" }
      },
      {
        id: "satellite-orbit", title: "人造衛星：軌道速率、週期與脫離速度",
        concept: "從高山上水平發射砲彈，速度越快落得越遠；快到地面彎曲的速度跟得上落下的速度時，它就永遠繞著地球「落下」——這就是圓軌道。萬有引力提供向心力，軌道越高速率越慢、週期越長；總力學能為負代表被束縛，達到零就能脫離地球。",
        formula: R`\( \dfrac{GMm}{r^2}=\dfrac{mv^2}{r}\Rightarrow v=\sqrt{\dfrac{GM}{r}},\quad E=-\dfrac{GMm}{2r},\quad v_{\text{脫離}}=\sqrt{\dfrac{2GM}{r}} \)`,
        points: ["萬有引力提供向心力", "軌道越高，速率越小、週期越長", "圓軌道的總力學能 E = −GMm/2r，動能等於 −E", "脫離速度是圓軌道速率的 √2 倍"],
        exam: { tag: "選修物理I 6-3 行星與人造衛星", how: "比較兩顆不同高度衛星的速率、週期、動能與總能；同步衛星的高度與週期；衛星減速後為什麼反而跑到較低軌道並變快。" }
      },
      {
        id: "conical-pendulum", title: "錐動擺",
        concept: "擺錘在水平面上做等速圓周運動，繩子掃出一個圓錐。張力的鉛直分量抵消重力，水平分量提供向心力；轉得越快，繩子越張開。週期只和擺錘到懸點的鉛直高度 h 有關。",
        formula: R`\( T\cos\theta=mg,\quad T\sin\theta=\dfrac{mv^2}{r},\quad \tan\theta=\dfrac{\omega^2 r}{g},\quad P=2\pi\sqrt{\dfrac{L\cos\theta}{g}} \)`,
        points: ["向心力不是新的力，是張力的水平分量", "張力 T = mg / cosθ，永遠大於重力", "角速度越大，張角 θ 越大", "週期只由鉛直高度 h = L cosθ 決定"],
        exam: { tag: "選修物理I 5-1 等速圓周運動", how: "畫出擺錘的受力圖，由 tanθ = v²/(rg) 求速率或週期；比較兩個擺長不同、高度相同的錐動擺週期。" }
      }
    ],
    waves: [
      {
        id: "ripple-tank", title: "水波槽：反射、折射、繞射與干涉",
        concept: "水波槽把看不見的波動畫成亮暗條紋。直線波遇到斜放的擋板會反射；進入淺水區波速變慢、波長變短而偏折；穿過窄縫會繞射散開；兩個同步的點波源會在水面上畫出一條條不動的節線。",
        formula: R`\( v=f\lambda,\quad \dfrac{\sin\theta_1}{\sin\theta_2}=\dfrac{v_1}{v_2}=\dfrac{\lambda_1}{\lambda_2},\quad |r_1-r_2|=\left(n-\tfrac12\right)\lambda\ \text{(節線)} \)`,
        points: ["頻率由波源決定，進入淺水區不變", "淺水區波速慢、波長短，波前偏向法線", "縫寬與波長相近時繞射最明顯", "節線上程差為半波長的奇數倍"],
        exam: { tag: "選修物理III 實驗：水波槽", how: "由節線數目與兩波源間距判斷波長範圍；判斷淺水區在哪一側；縫寬變小或波長變長時繞射如何改變。" }
      },
      {
        id: "sound-interference", title: "兩喇叭的聲波干涉",
        concept: "兩個喇叭接同一個訊號源，發出同頻率、同相位的聲波。拿著麥克風在前方走一遍，會聽到聲音忽大忽小：到兩喇叭距離差是整數個波長的地方相長，差半個波長的地方相消。",
        formula: R`\( \Delta r = n\lambda\ \text{（相長）},\quad \Delta r=\left(n+\tfrac12\right)\lambda\ \text{（相消）},\quad \lambda=\dfrac{v}{f} \)`,
        points: ["干涉需要同頻率且相位差固定的波源", "相長、相消由路徑差決定", "頻率越高，相鄰亮點（大聲處）越密", "把其中一個喇叭反接，相長與相消的位置互換"],
        exam: { tag: "選修物理III 延伸實驗：聲波干涉", how: "給喇叭間距與麥克風位置，判斷是相長或相消；或由相鄰兩個小聲位置的間距反推聲速。" }
      },
      {
        id: "sound-vacuum", title: "聲音需要介質：真空鐘罩",
        concept: "把響著的電鈴放進鐘罩，一邊抽氣一邊聽：聲音越來越小，但看得到鈴錘還在敲。聲音是介質粒子的振動一個傳一個，粒子越少，能傳出來的就越少；光不需要介質，所以鈴還是看得見。",
        formula: R`\( v_{\text{聲}} \approx 331+0.6\,T\ (\mathrm{m/s}),\quad \text{聲強} \propto \rho\, v\, \omega^2 A^2 \)`,
        points: ["聲音是力學波，必須有介質", "抽氣時聲音變小但不會立刻完全消失", "光是電磁波，真空中也能傳播", "固體、液體中聲速通常比空氣快"],
        exam: { tag: "國中自然 聲音的傳播 · 銜接必修 波動", how: "為什麼太空中聽不到爆炸聲卻看得到火光；聲波與光波何者需要介質。" }
      }
    ],
    optics: [
      {
        id: "apparent-depth", title: "視深與實深：水中的硬幣",
        concept: "從水面上方往下看，池底看起來比實際淺。來自硬幣的光離開水面時偏離法線，眼睛沿著折射光反向延長，看到的是一個抬高的虛像。近乎垂直往下看時，視深約等於實深除以水的折射率。",
        formula: R`\( n_1\sin\theta_1=n_2\sin\theta_2,\qquad h_{\text{視}}\approx\dfrac{h_{\text{實}}}{n}\ \text{（近法線觀察）} \)`,
        points: ["光從水進入空氣時偏離法線", "眼睛把折射光反向延長，看到抬高的虛像", "垂直往下看時視深 ≈ 實深 / n", "斜著看時，物體看起來更淺"],
        exam: { tag: "必修物理 光的折射 · 選修物理III 3-1", how: "游泳池看起來比實際淺的原因；給實深與折射率求視深；判斷從水中往上看岸上物體會偏高還是偏低。" }
      },
      {
        id: "plane-mirror", title: "平面鏡成像",
        concept: "平面鏡的像與物體對鏡面對稱：一樣大、正立、左右相反，而且是虛像——光線並沒有真的到達鏡子後面。要看到全身，鏡子只需要身高的一半，而且跟你站多遠無關。",
        formula: R`\( \theta_{\text{入}}=\theta_{\text{反}},\qquad d_{\text{像}}=d_{\text{物}},\qquad \text{全身鏡最短長度}=\tfrac12 H \)`,
        points: ["像距等於物距，像與物等大", "平面鏡成虛像，光屏接不到", "看到全身只需身高一半的鏡子", "鏡子轉 θ，反射光轉 2θ"],
        exam: { tag: "國中自然 光的反射 · 銜接必修 幾何光學", how: "全身鏡最短需要多長；人走近鏡子時像的大小與像距如何變；兩面鏡子夾角為 θ 時看到幾個像。" }
      },
      {
        id: "brewster-angle", title: "反射光的偏振（布魯斯特角）",
        concept: "陽光照在水面或黑板上反射出刺眼的光，透過偏光太陽眼鏡轉一轉，眩光會變暗。反射光已經部分偏振；當入射角使反射光與折射光互相垂直時，反射光完全偏振，這個角度稱為布魯斯特角。",
        formula: R`\( \tan\theta_B=\dfrac{n_2}{n_1},\qquad \theta_B+\theta_t=90^\circ \)`,
        points: ["反射光的振動方向偏向平行於反射面", "布魯斯特角時反射光完全偏振", "偏光太陽眼鏡的透光軸是鉛直的，用來擋水平振動的眩光", "水的布魯斯特角約 53°"],
        exam: { tag: "選修物理IV 延伸實驗：偏振片與反射光", how: "為什麼偏光太陽眼鏡能減少水面反光；給折射率求布魯斯特角；反射光與折射光垂直的幾何關係。" }
      }
    ],
    thermal: [
      {
        id: "four-stroke-engine", title: "四行程引擎與熱機效率",
        concept: "汽油引擎靠進氣、壓縮、動力、排氣四個行程把燃料的化學能變成機械能。只有動力行程對外做功，其餘三個行程靠飛輪的慣性帶過；燃燒放出的熱有一大部分隨廢氣與冷卻水流走，所以效率遠小於 100%。",
        formula: R`\( W=Q_{\text{入}}-Q_{\text{出}},\qquad \eta=\dfrac{W}{Q_{\text{入}}}<1 \)`,
        points: ["四個行程：進氣、壓縮、動力、排氣", "只有動力行程對外做功", "活塞往返兩次、曲軸轉兩圈完成一個循環", "排出的熱無法避免，效率必小於 1"],
        exam: { tag: "國中自然 熱機 · 必修物理 5-3 能量守恆", how: "哪個行程把內能轉成機械能；為什麼熱機效率不可能 100%；由輸入熱量與輸出功求效率。" }
      },
      {
        id: "brownian-diffusion", title: "布朗運動與擴散",
        concept: "在顯微鏡下看水中的花粉，小顆粒不停地亂跳——它被四面八方的水分子撞個不停，各方向撞擊不平衡。滴一滴墨水，它會慢慢自己散開；溫度越高分子越快，擴散也越快。這是「物質由不停運動的粒子組成」最直接的證據。",
        formula: R`\( \langle x^2\rangle = 2Dt,\qquad \tfrac12 m\overline{v^2}=\tfrac32 kT \)`,
        points: ["布朗運動是看得見的顆粒被看不見的分子撞擊", "顆粒越小、溫度越高，跳得越劇烈", "擴散距離與時間的平方根成正比，不是與時間成正比", "分子平均動能只由溫度決定"],
        exam: { tag: "國中自然 物質的粒子 · 必修物理 5-2 微觀尺度下的能量", how: "布朗運動證明了什麼；溫度升高時擴散速率與分子平均動能如何變化。" }
      }
    ],
    electric: [
      {
        id: "equipotential-mapping", title: "等位線與電場（導電紙描繪）",
        concept: "在導電紙上接兩個電極，用伏特計探針找出電位相同的點，連起來就是等位線。電場線處處與等位線垂直，由高電位指向低電位；等位線越密的地方，電場越強。",
        formula: R`\( E=-\dfrac{\Delta V}{\Delta d},\qquad W_{AB}=q(V_A-V_B),\qquad \vec E\perp\text{等位線} \)`,
        points: ["等位線上任兩點間移動電荷不做功", "電場線與等位線垂直", "等位線越密，電場越強", "平行板電極之間是等間距的直線等位線"],
        exam: { tag: "選修物理IV 實驗：等位線與電場", how: "由等位線圖判斷電場方向與強弱；把電荷沿等位線移動做功多少；實驗中伏特計的接法與找等位點的方法。" }
      },
      {
        id: "electric-potential", title: "電位與電位能：點電荷的電位地形",
        concept: "把電位想成地形高度：正電荷是一座山、負電荷是一個坑。正的試驗電荷會往低處滾，電位能變成動能；不管走哪一條路，從 A 到 B 電力做的功都一樣，只看兩點的電位差。",
        formula: R`\( V=\dfrac{kQ}{r},\quad U=qV,\quad W_{A\to B}=q(V_A-V_B)=-\Delta U \)`,
        points: ["電位是純量，多個電荷的電位直接相加", "電力做功與路徑無關", "正電荷由高電位往低電位移動時電位能減少", "電位為零的地方電場不一定為零"],
        exam: { tag: "選修物理IV 1-3 電位能與電位", how: "兩個點電荷連線上電位為零或電場為零的位置；把電荷從無窮遠移到某點需要做多少功；電子經過電位差加速後的動能（eV）。" }
      },
      {
        id: "parallel-plate-capacitor", title: "平行板電容器：面積、間距與介電質",
        concept: "兩片平行金屬板接上電池就能儲存電荷。板子越大、靠得越近，能存的電荷越多；中間塞入介電質，電容再提高 κ 倍。充好電後斷開電池再拉開板子，電量不變、電壓變大；接著電池時拉開，電壓不變、電量變少。",
        formula: R`\( C=\dfrac{\kappa\varepsilon_0A}{d},\quad Q=CV,\quad E=\dfrac{V}{d},\quad U=\tfrac12CV^2 \)`,
        points: ["電容只由幾何形狀與介電質決定", "接著電池：V 固定；斷開電池：Q 固定", "板間為均勻電場 E = V/d", "電容器儲存的是電場能量"],
        exam: { tag: "選修物理IV 靜電學 · 選修物理V 電路", how: "改變板距或插入介電質後，Q、V、E、U 各怎麼變（要先分清楚是否仍接著電池）。" }
      },
      {
        id: "triboelectric", title: "摩擦起電與電荷守恆",
        concept: "塑膠尺和毛皮互相摩擦，電子從毛皮跑到塑膠尺：尺帶負電、毛皮帶等量的正電。電荷沒有被創造，只是被搬家。帶電的尺能吸引小紙屑，同種電荷互斥、異種電荷相吸。",
        formula: R`\( Q_{\text{尺}}+Q_{\text{毛皮}}=0,\qquad Q=ne,\quad e=1.6\times10^{-19}\ \mathrm{C} \)`,
        points: ["摩擦起電是電子的轉移，不是產生電荷", "兩物體帶等量異性電荷（電荷守恆）", "容易失去電子的一方帶正電", "帶電體能吸引不帶電的輕小物體（感應極化）"],
        exam: { tag: "國中自然 靜電 · 銜接選修物理IV 電荷", how: "摩擦後哪一個帶正電、各帶多少電；帶電體為什麼能吸引不帶電的紙屑。" }
      }
    ],
    magnetism: [
      {
        id: "solenoid-field", title: "螺線管的磁場：裡面均勻嗎？",
        concept: "把導線繞成長螺線管通電，管內的磁力線幾乎平行且等距——中段的磁場是均勻的，大小只和每公尺匝數與電流有關，跟管子粗細無關。用霍爾探棒沿軸線移動，會看到在管口附近磁場掉到中央的一半左右。",
        formula: R`\( B=\mu_0 n I,\quad n=\dfrac{N}{L},\qquad B_{\text{管口}}\approx\tfrac12\mu_0 nI \)`,
        points: ["長螺線管內部中段是均勻磁場", "B 與每單位長度匝數 n、電流 I 成正比", "管外磁場很弱，形狀像條形磁鐵", "右手定則：四指沿電流方向，拇指指向 N 極"],
        exam: { tag: "選修物理IV 延伸實驗：螺線管內的磁場 · 國中 電流的磁效應", how: "判斷螺線管的 N 極；匝數或電流加倍時磁場如何變；管內中央與管口磁場的比較。" }
      },
      {
        id: "em-spectrum", title: "電磁波譜：從無線電到 γ 射線",
        concept: "無線電、微波、紅外線、可見光、紫外線、X 射線、γ 射線都是電磁波，在真空中都以光速前進，差別只在頻率與波長。頻率越高，每個光子的能量越大——這就是紫外線會曬傷、X 射線能穿透身體的原因。",
        formula: R`\( c=f\lambda=3.0\times10^8\ \mathrm{m/s},\qquad E=hf=\dfrac{hc}{\lambda},\quad hc\approx1240\ \mathrm{eV\cdot nm} \)`,
        points: ["所有電磁波在真空中速率都是 c", "頻率越高、波長越短、光子能量越大", "可見光只佔 400–700 nm 的一小段", "不同波段的應用取決於能量與穿透力"],
        exam: { tag: "必修物理 4-4 光波的特性 · 學測常考", how: "依頻率或波長排序各波段；由波長求光子能量（用 1240 eV·nm）；判斷哪些波段屬於游離輻射。" }
      }
    ],
    modern: [
      {
        id: "atom-structure", title: "原子及其結構：質子、中子與電子",
        concept: "原子由帶正電的原子核與核外的電子組成；原子核又由質子和中子構成。質子數決定是哪一種元素，原子不帶電是因為質子數等於電子數；中子數不同的同一種元素稱為同位素。原子核只佔原子極小的體積，卻集中了幾乎全部的質量。",
        formula: R`\( {}^{A}_{Z}\mathrm{X}:\ A=Z+N,\qquad m_p\approx m_n\approx1836\,m_e,\qquad r_{\text{核}}\sim10^{-15}\ \mathrm{m},\ r_{\text{原子}}\sim10^{-10}\ \mathrm{m} \)`,
        points: ["質子數 Z 決定元素種類", "質量數 A = 質子數 + 中子數", "中性原子的電子數等於質子數", "同位素：質子數相同、中子數不同"],
        exam: { tag: "必修物理 3-2 原子的結構 · 國中 原子結構", how: "由符號 ᴬ_Z X 求質子、中子、電子數；判斷兩個原子是否為同位素；原子核與原子大小的比例。" }
      },
      {
        id: "bohr-hydrogen", title: "波耳氫原子模型與光譜系列",
        concept: "波耳假設電子只能在特定軌道上，每個軌道有固定能量。電子從高能階跳到低能階時放出一個光子，光子能量恰好等於兩能階的差，所以氫只會發出幾條特定顏色的光。落回 n = 2 的那一組在可見光區，稱為巴耳末系。",
        formula: R`\( E_n=-\dfrac{13.6}{n^2}\ \mathrm{eV},\quad r_n=n^2a_0,\quad hf=E_{\text{高}}-E_{\text{低}},\quad \dfrac1\lambda=R\left(\dfrac1{n_f^2}-\dfrac1{n_i^2}\right) \)`,
        points: ["能階是不連續的（量子化）", "躍遷放出的光子能量等於能階差", "落回 n = 1 為紫外線（來曼系），落回 n = 2 有可見光（巴耳末系）", "游離能 13.6 eV 是把電子從 n = 1 移到無窮遠"],
        exam: { tag: "選修物理V 3-2 波耳氫原子模型 · 必修物理 6-5 原子光譜", how: "由 n = 3 → 2 求放出光子的波長；n = 4 的電子最多能放出幾種光子；為什麼氫光譜是線光譜。" }
      },
      {
        id: "matter-wave", title: "物質波：電子也會繞射",
        concept: "德布羅意主張電子也有波長，動量越大波長越短。讓電子束射向晶體或雙狹縫，螢幕上會出現和光一樣的亮暗條紋；一個一個電子打上去時落點看似隨機，累積起來才浮現條紋——粒子性與波動性同時存在。",
        formula: R`\( \lambda=\dfrac{h}{p}=\dfrac{h}{\sqrt{2meV}},\qquad \lambda\,(\mathrm{nm})\approx\dfrac{1.23}{\sqrt{V}} \)`,
        points: ["物質波波長 λ = h/p", "加速電壓越大，電子波長越短，條紋越密", "單一電子落點隨機，大量累積出干涉條紋", "戴維森—革末實驗證實了電子的波動性"],
        exam: { tag: "必修物理 6-3 物質的波動性 · 6-4 波粒二象性", how: "加速電壓變為 4 倍時物質波波長如何變；同速率的電子與質子誰的波長較長；電子顯微鏡為什麼比光學顯微鏡清楚。" }
      },
      {
        id: "x-ray-tube", title: "X 射線管：連續譜與特性譜",
        concept: "高速電子撞上金屬靶突然減速，放出連續的 X 射線（制動輻射）；能量最高的光子來自電子把全部動能一次給出，所以有最短波長。若電子把靶原子的內層電子打出去，外層電子補位時會放出特定波長的尖峰，稱為特性 X 射線，它由靶材決定。",
        formula: R`\( eV=hf_{\max}=\dfrac{hc}{\lambda_{\min}},\qquad \lambda_{\min}\,(\mathrm{nm})\approx\dfrac{1240}{V} \)`,
        points: ["連續譜來自電子減速（制動輻射）", "最短波長只由加速電壓決定，與靶材無關", "特性譜線的位置由靶材決定，與電壓無關", "電壓必須超過門檻，才會出現特性譜線"],
        exam: { tag: "選修物理V 2-2 X 射線", how: "加速電壓加倍時截止波長如何變；換靶材時哪一部分的光譜會移動；由截止波長反推普朗克常數。" }
      },
      {
        id: "mass-energy", title: "質能守恆：核分裂與核融合",
        concept: "原子核的質量比組成它的質子與中子加起來還小，少掉的質量（質量虧損）就是把核子綁在一起的結合能。重核分裂成中等大小的核、或輕核融合成較重的核時，平均每個核子的結合能變大，多出來的能量就以 E = Δmc² 放出。",
        formula: R`\( E=\Delta m\,c^2,\qquad 1\ \mathrm{u}\leftrightarrow931.5\ \mathrm{MeV} \)`,
        points: ["核子結合後質量變小，差值就是結合能", "鐵附近的原子核每核子結合能最大、最穩定", "重核分裂與輕核融合都會放出能量", "核反應前後質量數與電荷數守恆"],
        exam: { tag: "必修物理 5-4 質能守恆", how: "由反應前後質量差求放出能量；判斷核反應方程式缺的粒子；為什麼分裂和融合都能放能量。" }
      },
      {
        id: "nuclear-chain-reaction", title: "核分裂連鎖反應與控制棒",
        concept: "鈾-235 吸收一個中子後分裂，同時放出 2～3 個新中子。若平均每次分裂放出的中子中，恰好有一個引發下一次分裂，反應穩定進行（臨界）；多於一個就越來越快（超臨界）。核電廠用控制棒吸收中子、用減速劑讓中子變慢，把反應維持在臨界。",
        formula: R`\( {}^{235}\mathrm{U}+n\rightarrow{}^{141}\mathrm{Ba}+{}^{92}\mathrm{Kr}+3n+\approx200\ \mathrm{MeV},\qquad N_{k+1}=k\,N_k \)`,
        points: ["每次分裂放出 2～3 個中子", "增殖因數 k = 1 為臨界、k > 1 為超臨界", "控制棒吸收中子以降低 k", "減速劑把快中子減速，較容易被鈾-235 吸收"],
        exam: { tag: "必修物理 5-4 質能守恆 · 能源的開發與利用", how: "核電廠如何控制反應速率；控制棒與減速劑各自的作用；一次分裂約放出多少能量。" }
      }
    ]
  });

  /* 把新實驗接進首頁的銜接路徑（國中打底 → 高中建模） */
  const paths = C.learningPaths || [];
  const stage = (pathId, kind) => {
    const p = paths.find(x => x.id === pathId);
    return p && p.stages.find(s => s.kind === kind);
  };
  const add = (pathId, kind, ids) => { const s = stage(pathId, kind); if (s) ids.forEach(id => { if (!s.ids.includes(id)) s.ids.push(id); }); };
  add("motion", "senior", ["conical-pendulum", "satellite-orbit"]);
  add("thermal", "junior", ["brownian-diffusion", "four-stroke-engine"]);
  add("wave-optics", "junior", ["sound-vacuum", "plane-mirror"]);
  add("wave-optics", "senior", ["ripple-tank", "apparent-depth"]);
  add("electromagnetism", "junior", ["triboelectric", "solenoid-field"]);
  add("electromagnetism", "senior", ["equipotential-mapping", "parallel-plate-capacitor"]);
  add("modern", "junior", ["atom-structure"]);
  add("modern", "senior", ["bohr-hydrogen", "matter-wave", "mass-energy"]);
})();
