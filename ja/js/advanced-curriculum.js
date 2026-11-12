/* 第三批課程地圖：將進階課本觀念、實驗分析與跨章應用做成獨立互動實驗。 */
(function () {
  "use strict";
  const C = window.PhysicsLabCurriculum;
  if (!C) return;
  const R = String.raw;
  const I = true;

  const ADDITIONS = {
    kinematics: [
      { id: "terminal-velocity", title: "空気抵抗と終端速度", interactive: I, concept: "落ちる速さが大きくなると空気抵抗も大きくなります。抵抗が重力とつり合うと合力が 0 になり、物体は終端速度で等速で落ちます。", formula: R`\( mg = bv_t^2,\quad v_t=\sqrt{mg/b} \)`, points: ["抵抗の向きはいつも速度と逆", "終端速度のとき加速度は 0", "面積が大きいか、媒質が濃いと、終端速度は小さい", "雨粒やパラシュートがその例"] }
    ],
    newton: [
      { id: "rolling-motion", title: "すべらずに転がる運動とエネルギーの分かれ方", interactive: I, concept: "物体がすべらずに斜面を転がり下りるとき、並進の運動エネルギーと回転の運動エネルギーを同時にもちます。慣性モーメントが違うと加速度が変わります。", formula: R`\( mgh=\frac12mv^2+\frac12I\omega^2,\quad v=\omega R \)`, points: ["中身の詰まった球は、ふつう輪より先にゴールする", "すべらない条件 v=ωR", "エネルギーが並進と回転に分かれる", "静止摩擦力は全体として仕事をしない"] }
    ],
    momentum: [
      { id: "multistage-rocket", title: "多段ロケットと切り離し", interactive: I, concept: "燃料を使い切った段を切り離すと、残りの質量が小さくなり、燃料をより効率よく速度の変化に変えられます。", formula: R`\( \Delta v=\sum v_{e,i}\ln\frac{m_{0,i}}{m_{f,i}} \)`, points: ["切り離すたびに、そのあと加速すべき質量が減る", "段を分けると速度の増加を積み重ねられる", "進むしくみは運動量保存", "機体そのものの質量も考える必要がある"] }
    ],
    gravity: [
      { id: "rotation-dynamics", title: "回転の運動方程式と角加速度", interactive: I, concept: "固定軸のある剛体に力のモーメントを加えると、角加速度が生じます。同じ力のモーメントなら、慣性モーメントが大きいほど回転の速さを変えにくくなります。", formula: R`\( \tau=I\alpha,\quad \omega=\omega_0+\alpha t \)`, points: ["力のモーメントが回転を引き起こす", "I は直線運動の質量にあたる", "うでが長いほど力のモーメントは大きい", "角加速度の向きは右ねじの向きで決める"] }
    ],
    thermal: [
      { id: "heat-transfer", title: "伝導、対流、放射", interactive: I, concept: "熱は、伝導、流体の対流、電磁波の放射で伝わります。材料、表面、温度差が冷える速さにどう影響するかを比べます。", formula: R`\( \dot Q_{cond}=kA\frac{\Delta T}{L},\quad P_{rad}\propto T^4 \)`, points: ["伝導は粒子の衝突で伝わる", "対流は流体全体の流れで伝わる", "放射には媒質がいらない", "保温は熱が伝わる速さを小さくする"] },
      { id: "thermal-expansion", title: "熱膨張とバイメタル", interactive: I, concept: "温度が上がると、固体、液体、気体の大きさは増えます。膨張率の違う 2 種類の金属をはり合わせた板は、熱すると曲がります。", formula: R`\( \Delta L=\alpha L_0\Delta T \)`, points: ["のびる量は元の長さと温度差に比例する", "材料によって α は違う", "線路にはすき間をあけておく必要がある", "バイメタルは温度で切りかわるスイッチに使える"] },
      { id: "viscosity-reynolds", title: "粘性抵抗とレイノルズ数", interactive: I, concept: "流体の粘性は相対的な動きをさまたげます。レイノルズ数を使うと、流れが層流に近いか乱流に近いかを判断できます。", formula: R`\( F_d=6\pi\eta rv,\quad Re=\frac{\rho vD}{\eta} \)`, points: ["粘度が大きいと抵抗も大きい", "レイノルズ数が小さいと層流になりやすい", "レイノルズ数が大きいと乱流になりやすい", "血液の流れ、管の流れ、空気抵抗とつながる"] },
      { id: "continuity-hydraulic", title: "連続の式と水圧機", interactive: I, concept: "圧縮されない流体が管の中を流れるとき、流量は保存されます。閉じこめた液体は、パスカルの原理で圧力を伝え、力を大きくできます。", formula: R`\( A_1v_1=A_2v_2,\quad \frac{F_1}{A_1}=\frac{F_2}{A_2} \)`, points: ["断面がせまくなると流れが速くなる", "どの断面でも流量は同じ", "水圧機は小さな力で重い物を持ち上げられる", "力を大きくしてもエネルギー保存はやぶれない"] }
    ],
    waves: [
      
    ],
    optics: [
      { id: "malus-law", title: "マリュスの法則と偏光板", interactive: I, concept: "直線偏光が検光子を通るとき、通りぬける光の強さは 2 つの偏光の向きのなす角で決まります。", formula: R`\( I=I_0\cos^2\theta \)`, points: ["平行のとき、いちばんよく光を通す", "垂直のとき、理想的には真っ暗", "強さは cos²θ に比例する", "偏光サングラスに使われている"] },
      { id: "thin-film", title: "薄膜の干渉と構造色", interactive: I, concept: "シャボン玉や油の膜の上の面と下の面で反射した光には光路差があり、膜の厚さによって、波長ごとに強め合ったり弱め合ったりします。", formula: R`\( 2nt=(m+\tfrac12)\lambda \)`, points: ["色は膜の厚さと見る角度で変わる", "反射のとき位相が半波長ずれることがある", "白色光から色のしまが現れる", "チョウの羽や油の膜には構造色がある"] },
      { id: "fizeau-light-speed", title: "フィゾーの歯車と光の速さの測定", interactive: I, concept: "光を回転する歯車のすき間から遠くの鏡まで送って反射させ、もどってきた光が次の歯でさえぎられるように回転の速さを調節すると、光の速さを見積もれます。", formula: R`\( c\approx4dNf \)`, points: ["往復の道のりを長くすると時間を測れる", "光がさえぎられる条件で、歯の数と回転の速さが結びつく", "光の速さはとても大きいが、実験で測ることができる", "歴史上大切な、地上での測定方法"] }
    ],
    electric: [
      { id: "rl-transient", title: "RL 回路の過渡現象と逆起電力", interactive: I, concept: "コイルに電流を流しはじめても、自己誘導が電流の変化をさまたげるので、電流はすぐには一定の値になりません。電源を切ったときも、元の電流を保とうとします。", formula: R`\( I(t)=\frac{V}{R}(1-e^{-tR/L}) \)`, points: ["コイルは電流の変化をさまたげる", "時定数 τ=L/R", "電流はとぎれずに変わるが、傾きは変わる", "リレーやモーターのコイルでは、逆向きの高い電圧に対策が必要"] },
      { id: "diode-rectifier", title: "ダイオードによる整流と平滑", interactive: I, concept: "ダイオードはおもに一方向の電流しか通さないので、交流を脈流に変えられます。コンデンサーを加えると、電圧の波打ち（リプル）を小さくできます。", formula: R`\( V_{out}\approx|V_0\sin\omega t| \)`, points: ["半波整流では波形の半分だけが残る", "全波整流では周波数が 2 倍になる", "平滑用のコンデンサーは電圧のピークで充電される", "実際のダイオードには順方向の電圧降下がある"] },
      { id: "semiconductor-led", title: "pn 接合と LED の発光", interactive: I, concept: "順方向の電圧をかけると pn 接合の障壁が低くなり、電子とホールが再結合するときにエネルギーを光として出せます。LED の色はバンドギャップで決まります。", formula: R`\( E_g\approx\frac{hc}{\lambda} \)`, points: ["pn 接合には向きがある", "順方向では電流が流れ、逆方向では流れない", "バンドギャップで光の色が決まる", "LED には電流を制限する抵抗を直列につなぐ"] },
      { id: "oscilloscope", title: "オシロスコープと信号の測定", interactive: I, concept: "オシロスコープは電圧の時間変化を波形として表示し、振幅、周期、周波数、2 つの信号の位相差を測れます。", formula: R`\( f=1/T,\quad V_{pp}=2V_0 \)`, points: ["縦軸は電圧", "横軸は時間", "トリガーで波形を止めて見られる", "正弦波、方形波、直流の信号を比べられる"] }
    ],
    magnetism: [
      { id: "hall-effect", title: "ホール効果とキャリアの向き", interactive: I, concept: "電流が流れている半導体を垂直な磁場に置くと、キャリアがローレンツ力で片側に寄ってホール電圧が生じます。これで、おもなキャリアが正か負かを判断できます。", formula: R`\( V_H=\frac{IB}{nqt} \)`, points: ["ホール電圧は電流と磁場に比例する", "電圧の向きでキャリアの符号がわかる", "うすいほど信号は大きい", "磁気センサーのもとになる"] },
      { id: "current-balance", title: "電流てんびんと、電流が磁場から受ける力の測定", interactive: I, concept: "電流が流れる導線を一様な磁場の中に置き、てんびんで小さな力を測って、力と I、B、L の関係を確かめます。", formula: R`\( F=BIL \)`, points: ["力を電流に対してグラフにすると、傾きが求まる", "導線は磁場に垂直に置く", "電流の向きを逆にして比べられる", "電磁気の力を数量的に調べる実験"] },
      { id: "eddy-current", title: "渦電流と磁気ブレーキ", interactive: I, concept: "磁石を導体に近づけると、導体の中に渦電流が生じ、レンツの法則にしたがって相対的な動きをさまたげます。ふれずにブレーキをかけられます。", formula: R`\( \varepsilon=-\frac{d\Phi_B}{dt} \)`, points: ["誘導電流の向きは磁束の変化をさまたげる", "速いほどブレーキがよく効く", "導体を外の回路につなぐ必要はない", "ジェットコースターやメーターでよく使われる"] },
      { id: "em-polarization", title: "電磁波の偏光", interactive: I, concept: "電磁波の電場と磁場は、どちらも進む向きに垂直です。偏光子は、決まった向きに振動する電場だけを選びます。", formula: R`\( \vec E\perp\vec B\perp\vec k \)`, points: ["電磁波は横波", "電場の向きで偏光の向きを決める", "2 枚の偏光子で通りぬける強さを調節できる", "無線通信ではアンテナの偏光の向きを合わせる必要がある"] },
      { id: "antenna-resonance", title: "アンテナの共振と波長", interactive: I, concept: "アンテナの長さが電磁波の波長の決まった割合に近いと、電流の分布が共振して、送受信の効率が上がります。", formula: R`\( L\approx\lambda/4,\quad c=\lambda f \)`, points: ["周波数が高いほど波長は短い", "4 分の 1 波長のアンテナがよく使われる", "長さが合わないと送受信の効率が下がる", "アンテナの向きは偏光と関係がある"] }
    ],
    modern: [
      { id: "radiation-shielding", title: "α 線、β 線、γ 線とさえぎり方", interactive: I, concept: "放射線の種類によって、透過力と電離作用が違います。紙、アルミニウム、鉛などでさえぎって、検出器のカウント数を測ります。", formula: R`\( I=I_0e^{-\mu x} \)`, points: ["α 線は紙でさえぎれる", "β 線はアルミニウム板でさえぎることが多い", "γ 線には厚くて密度の大きい材料が必要", "安全の原則は「時間・距離・遮へい」"] }
    ]
  };

  C.modules.forEach(module => module.experiments.push(...(ADDITIONS[module.id] || [])));
  let total = 0, interactive = 0;
  C.modules.forEach(module => module.experiments.forEach(experiment => { total++; if (experiment.interactive) interactive++; }));
  C.totalExperiments = total;
  C.totalInteractive = interactive;
})();
