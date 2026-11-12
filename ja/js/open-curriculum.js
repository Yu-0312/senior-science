/* 第五、六批：資料驅動的跨領域與大學先修題型庫，可由後續檔案無上限追加。 */
(function () {
  "use strict";
  const C = window.PhysicsLabCurriculum;
  if (!C || !C.extendCatalog) return;
  const R = String.raw, I = true;

  C.extendCatalog("cross-domain-labs-2026-07", {
    thermal: [
      { id: "u-tube-manometer", title: "U 字管圧力計", interactive: I, concept: "両側の液面の高さの差は圧力の差を表します。加える圧力と液体の密度を変えて、高さの差が圧力の値にどう換算されるかを見ます。", formula: R`\( \Delta P=\rho g\Delta h \)`, points: ["高さの差は圧力の差を表す", "液体の密度が大きいほど、同じ圧力の差でも高さの差は小さい", "両側の液面が同じ高さなら圧力は等しい", "気体の圧力を測れる"] },
      { id: "metal-specific-heat", title: "混合法による金属の比熱の測定", interactive: I, concept: "熱した金属を水に入れると、金属が出した熱と水が受け取った熱は等しくなります。最後の温度から金属の比熱が求められます。", formula: R`\( m_mc_m(T_m-T_f)=m_wc_w(T_f-T_w) \)`, points: ["高温の物体は熱を出し、低温の物体は熱を受け取る", "熱平衡では温度が等しい", "容器が熱を吸うと系統誤差になる", "比熱は温まりにくさを表す"] },
      { id: "heat-conduction", title: "棒を伝わる熱と熱伝導率", interactive: I, concept: "熱が伝わる速さは、材料、断面積、長さ、両端の温度差で変わります。金属の棒と断熱材で、一定になったときの熱の流れを比べます。", formula: R`\( P=\dfrac{kA\Delta T}{L} \)`, points: ["温度差が大きいほど熱の流れは大きい", "棒が長いほど熱は伝わりにくい", "断面積が大きいほど熱はよく伝わる", "材料によって熱伝導率は違う"] }
    ],
    waves: [
      { id: "seismic-triangulation", title: "地震の P 波と S 波の到着時刻の差で震源を求める", interactive: I, concept: "P 波は速く、S 波は遅く伝わります。1 つの観測点での到着時刻の差（初期微動継続時間）から震源までの距離が見積もれ、いくつかの観測点のデータを組み合わせると震央の位置がわかります。", formula: R`\( d=\dfrac{\Delta t}{1/v_S-1/v_P} \)`, points: ["P 波が先に、S 波があとに着く", "到着時刻の差が大きいほど遠い", "少なくとも 3 つの観測点があれば震央が決まる", "地下の速さのモデルで位置の誤差が変わる"] },
      { id: "string-harmonic-spectrum", title: "弦の倍振動と音の高さ", interactive: I, concept: "両端を固定した弦には、整数倍の倍振動しかできません。長さ、張力、線密度を変えて、基本振動と倍音がどう変わるかを見ます。", formula: R`\( f_n=\dfrac{n}{2L}\sqrt{\dfrac{T}{\mu}} \)`, points: ["基本振動はいちばん低い固有振動数", "倍振動の振動数は基本振動の整数倍", "張力を大きくすると音が高くなる", "弦が短いほど音は高い"] },
      { id: "noise-barrier", title: "防音壁と音の弱まり方", interactive: I, concept: "音は広がりながら進むので、距離が離れるほど弱くなります。さらに防音壁があると、聞く人に届く音の強さが下がります。", formula: R`\( I=\dfrac{I_0}{r^2}10^{-IL/10} \)`, points: ["距離が 2 倍になると、音の強さは約 4 分の 1", "デシベルの差は対数の目盛り", "防音壁は、まっすぐ届く音の道をさえぎる必要がある", "低い音はさえぎりにくい"] }
    ],
    optics: [
      { id: "lens-combination", title: "薄いレンズの組み合わせと合成焦点距離", interactive: I, concept: "2 枚の薄いレンズを近づけて置くと、光を集める能力はたし合わせられます。凸レンズと凹レンズを組み合わせると、全体の焦点距離を変えられます。", formula: R`\( \dfrac{1}{f_{eq}}=\dfrac{1}{f_1}+\dfrac{1}{f_2} \)`, points: ["凸レンズの焦点距離は正とする", "凹レンズの焦点距離は負とする", "レンズを組み合わせると焦点距離を短くも長くもできる", "望遠鏡やカメラは何枚ものレンズを使う"] },
      { id: "photometry-inverse-square", title: "照度と逆 2 乗の法則", interactive: I, concept: "点光源から出た光は、離れるほど大きな球面に広がるので、受ける面の照度は距離の 2 乗に反比例して下がります。", formula: R`\( E=\dfrac{I}{r^2} \)`, points: ["距離が 2 倍になると、照度は約 4 分の 1", "光源の明るさと距離は分けて考える", "撮影や照明では距離を考える", "このモデルは、点光源で光が吸収されないと仮定している"] },
      { id: "prism-spectrometer", title: "プリズムの最小偏角で屈折率を測る", interactive: I, concept: "光がプリズムの中を対称に通るとき、偏角が最小になります。頂角と最小偏角を測れば、材料の屈折率が計算できます。", formula: R`\( n=\dfrac{\sin[(A+D_m)/2]}{\sin(A/2)} \)`, points: ["最小偏角のとき、光の道すじは対称", "頂角と偏角から屈折率が決まる", "波長によって屈折率は違う", "スペクトルの分析に使える"] }
    ],
    electric: [
      { id: "voltage-divider", title: "分圧回路とセンサーの読み取り", interactive: I, concept: "直列につないだ 2 つの抵抗が電源の電圧を分け合います。可変抵抗や光センサー（CdS）を使うと、まわりの変化を測れる出力電圧に変えられます。", formula: R`\( V_{out}=V_{in}\dfrac{R_2}{R_1+R_2} \)`, points: ["直列では電流が同じ", "出力は抵抗の比で決まる", "つなぐ先の入力抵抗によって値が変わる（負荷の影響）", "センサーをつなぐ回路でよく使われる"] },
      { id: "rc-timer", title: "RC 回路によるタイマーと遅延", interactive: I, concept: "コンデンサーを抵抗を通して充電すると、電圧は指数関数的に上がります。R と C を変えれば、いろいろな遅延時間やタイマーの時間を設計できます。", formula: R`\( V_C=E(1-e^{-t/RC}) \)`, points: ["時定数は RC", "時定数 1 つ分の時間で約 63% まで充電される", "R や C を大きくすると反応が遅くなる", "点滅回路や遅延回路に使える"] },
      { id: "electrolysis", title: "電気分解とファラデーの法則", interactive: I, concept: "電流が電解液を流れると、電極に物質が析出します。流れた電気量が多いほど、析出する質量も大きくなります。", formula: R`\( m=\dfrac{ItM}{nF} \)`, points: ["電気量 Q=It", "析出する量は電流と時間に比例する", "イオンの価数によって析出する量が変わる", "めっきや電解精錬に使われる"] }
    ],
    magnetism: [
      { id: "tangent-galvanometer", title: "正接検流計と地磁気", interactive: I, concept: "円形コイルの磁場が地磁気と重なり合います。磁針の振れの角の正接を使うと、コイルの電流と地磁気を結びつけられます。", formula: R`\( \tan\theta=\dfrac{\mu_0NI}{2rB_E} \)`, points: ["磁針は合成された磁場の向きを指す", "電流が大きいほど振れの角も大きい", "コイルの半径で磁場が変わる", "地磁気の大きさの見当がつけられる"] },
      { id: "cyclotron-frequency", title: "サイクロトロンとサイクロトロン振動数", interactive: I, concept: "荷電粒子は垂直な磁場の中で円運動をします。相対性理論を考えなくてよい範囲では、回る振動数は速さにも半径にも関係しません。", formula: R`\( f=\dfrac{qB}{2\pi m} \)`, points: ["磁場から受ける力が向心力になる", "振動数は磁場に比例する", "振動数は粒子の質量に反比例する", "速くなると相対性理論による補正が必要"] },
      { id: "mutual-induction", title: "相互誘導と変圧器の結合", interactive: I, concept: "一次コイルの電流が変わると二次コイルを通る磁束が変わり、誘導起電力が生じます。変化が速いほど誘導電圧は大きくなります。", formula: R`\( \varepsilon=-M\dfrac{\Delta I}{\Delta t} \)`, points: ["変化する電流でなければ誘導は起こらない", "相互インダクタンスはコイルの結びつき方で決まる", "向きはレンツの法則にしたがう", "変圧器が動くしくみ"] }
    ],
    modern: [
      { id: "geiger-statistics", title: "ガイガーカウンターと偶然誤差", interactive: I, concept: "放射性崩壊はでたらめに起こる現象です。決まった時間のカウント数は上下にばらつき、標準偏差はおよそカウント数の平方根です。", formula: R`\( \sigma_N\approx\sqrt{N} \)`, points: ["1 個の原子がいつ崩壊するかは予測できない", "カウント数が多いほど相対誤差は小さい", "バックグラウンドのカウントを引く", "何度も測ると統計的なばらつきが読み取れる"] }
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
      { id: "fresnel-diffraction", title: "フレネル回折とフレネル数", interactive: I, concept: "スクリーンがあまり遠くないとき、回折の模様は近い場のフレネル領域で決まります。穴の大きさと伝わる距離を変えて、近い場から遠い場へ移り変わる様子を見ます。", formula: R`\( N_F=\dfrac{a^2}{\lambda z} \)`, points: ["フレネル数は穴の大きさと伝わる距離を比べたもの", "N_F が大きいときは近い場の回折", "N_F がとても小さいとフラウンホーファー回折に近づく", "回折が結像系の分解能の限界を決める"] }
    ],
    electric: [
      { id: "bode-low-pass", title: "RC ローパスフィルターの周波数特性", interactive: I, concept: "RC ローパスフィルターは低い周波数を通し、高い周波数を弱めます。入力の周波数を変えていって利得のグラフを見て、回路の設計と信号処理で使うボード線図の考え方につなげます。", formula: R`\( |H(f)|=\dfrac{1}{\sqrt{1+(f/f_c)^2}} \)`, points: ["遮断周波数は利得が -3 dB になる所", "低い周波数はほぼそのまま通る", "高い周波数では利得がほぼ周波数に反比例して下がる", "ボード線図では、ふつう周波数の軸を対数にする"] }
    ],
    magnetism: [
      { id: "biot-savart-axis", title: "ビオ・サバールの法則と円形コイルの軸上の磁場", interactive: I, concept: "円形コイルの小さな部分の電流が、それぞれ軸上の点に磁場をつくります。それをたし合わせると、軸にそった磁場の分布が得られます。", formula: R`\( B(z)=\dfrac{\mu_0NIR^2}{2(R^2+z^2)^{3/2}} \)`, points: ["磁場は電流の小部分の寄与をたし合わせたもの", "コイルの中心で磁場が最大", "中心から離れると磁場は急に弱くなる", "ヘルムホルツコイルや磁場の校正のもとになる"] }
    ],
    modern: [
      
    ]
  });

  // 課程不是把不同學段的內容堆在一起，而是讓同一個核心概念逐步加深。
  // app.js 讀取這份資料建立首頁路徑與各實驗頁的前後銜接導覽。
  C.learningPaths = [
    {
      id: "motion",
      title: "運動と力",
      description: "運動を表し、グラフを描くところから、モデルで振動や天体の運動を予測するところまで。",
      stages: [
        { level: "中学理科の基礎", kind: "junior", note: "まず反応時間を測るものさし、超音波距離センサー、自由落下で、位置と時間を測る。", ids: ["reaction-time", "motion-sensor", "freefall"] },
        { level: "高校：モデルを立てる", kind: "senior", note: "次に運動のグラフ、ニュートンの法則、エネルギー保存で問題を解く。", ids: ["uniform-accel", "newton2", "energy-track"] },
        { level: "大学への発展", kind: "university", note: "最後に回転、実体振り子、連成振動を実験台にのせて、いくつもの物体がある系の動きを見る。", ids: ["rotation-dynamics", "physical-pendulum", "coupled-oscillators"] }
      ]
    },
    {
      id: "thermal",
      title: "熱とエネルギー",
      description: "温度と熱の移動から、エネルギーの流れと不可逆な変化まで。",
      stages: [
        { level: "中学理科の基礎", kind: "junior", note: "まず温度、熱、状態変化を区別し、試験管の栓が飛ぶ実験で内部エネルギーが力学的エネルギーに変わるしくみをつかむ。", ids: ["gas-laws", "heat", "phase-change", "heat-engine-principle"] },
        { level: "高校：モデルを立てる", kind: "senior", note: "熱力学第一法則、熱の移動、熱量計で、エネルギーの出入りを数字で測る。", ids: ["thermo1", "heat-transfer", "calorimetry-mixing"] },
        { level: "大学への発展", kind: "university", note: "熱を伝える棒と冷却曲線で、熱の流れを測れる法則として書く。", ids: ["heat-conduction", "newton-cooling"] }
      ]
    },
    {
      id: "wave-optics",
      title: "波と光",
      description: "目に見える振動や音から始めて、干渉、回折、スペクトルを少しずつ読み解く。",
      stages: [
        { level: "中学理科の基礎", kind: "junior", note: "波の種類、音の性質、光と影の現象でイメージをつくる。", ids: ["wave-types", "sound-properties", "shadow-pinhole"] },
        { level: "高校：モデルを立てる", kind: "senior", note: "重ね合わせ、定常波、干渉と回折で、波形と観察結果を結びつける。", ids: ["superposition", "standing-wave", "double-slit", "diffraction"] },
        { level: "大学への発展", kind: "university", note: "さらに弦の倍振動から音色を聞き分け、近い場と遠い場の回折を比べる。", ids: ["string-harmonic-spectrum", "fresnel-diffraction"] }
      ]
    },
    {
      id: "electromagnetism",
      title: "電気と磁気",
      description: "安全に回路を測るところから、信号処理や磁場の重ね合わせの発展モデルまで。",
      stages: [
        { level: "中学理科の基礎", kind: "junior", note: "まず電圧、電流、抵抗、磁場の向きを、手を動かしてつかむ。", ids: ["ohms", "resistors", "current-field"] },
        { level: "高校：モデルを立てる", kind: "senior", note: "次にコンデンサー、電磁誘導、交流の共振の変化を測る。", ids: ["capacitor", "induction", "rlc-resonance"] },
        { level: "大学への発展", kind: "university", note: "最後に周波数特性と電流の小部分の重ね合わせで、実際の装置を表す。", ids: ["bode-low-pass", "biot-savart-axis"] }
      ]
    },
    {
      id: "modern",
      title: "光、原子と量子",
      description: "光の色やスペクトルといった目に見える現象から、量子化されたエネルギー準位のモデルへ。",
      stages: [
        { level: "中学理科の基礎", kind: "junior", note: "まず光の色の混ぜ合わせ、分散、プリズムで光の手がかりを観察する。", ids: ["rgb-color-mixing", "dispersion", "prism-spectrometer"] },
        { level: "高校：モデルを立てる", kind: "senior", note: "光電効果、輝線スペクトル、油滴実験で量子化の考え方をつかむ。", ids: ["photoelectric", "spectroscopy", "millikan"] },
        { level: "大学への発展", kind: "university", note: "最後に散乱実験とガイガーカウンターで、原子核と量子のでたらめさを見る。", ids: ["rutherford", "geiger-statistics"] }
      ]
    }
  ];
})();
