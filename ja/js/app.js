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

  /*
   * 學段標記：這個實驗在哪一級。
   * 國中／高中是課綱本體；大學延伸是「銜接用的先修直覺」，必須在頁面上講清楚，
   * 否則自學的高中生會以為自己必須先學完拉格朗日量才能玩這個網站。
   */
  function levelForExperiment(id) {
    let universityNote = "";
    let seniorNote = "";
    let juniorNote = "";
    LEARNING_PATHS.forEach(path => {
      (path.stages || []).forEach(stage => {
        if (!(stage.ids || []).includes(id)) return;
        if (stage.kind === "university") universityNote = stage.note || "大学の物理につながる考え方";
        if (stage.kind === "senior") seniorNote = stage.note || "高校物理";
        if (stage.kind === "junior") juniorNote = stage.note || "中学理科の基礎";
      });
    });
    if (universityNote) {
      return {
        kind: "university",
        label: "大学への発展",
        hint: "高校の内容の先へ、同じ現象をもう一歩くわしく見ます。大学の授業を先に学ぶ必要はありません。「この先こんなことを学ぶ」くらいの気持ちで見てください。" +
          (universityNote ? " " + universityNote : "")
      };
    }
    if (seniorNote || juniorNote) {
      return {
        kind: "senior",
        label: "高校物理",
        hint: "高校物理の内容に対応。" + (seniorNote || juniorNote)
      };
    }
    return {
      kind: "senior",
      label: "高校物理",
      hint: "高校の内容が中心です。途中に大学レベルの段階があれば、そこに印を付けています。"
    };
  }

  function paintLevelBadge(id) {
    const host = $("#exp-header") || document.querySelector(".exp-header");
    if (!host) return;
    const old = host.querySelector(".exp-level-badge");
    if (old) old.remove();
    const info = levelForExperiment(id);
    const badge = el("span", "exp-level-badge is-" + info.kind);
    badge.textContent = info.label;
    badge.title = info.hint;
    badge.setAttribute("role", "note");
    badge.setAttribute("aria-label", info.label + "。" + info.hint);
    const title = $("#exp-title");
    if (title && title.parentNode) title.parentNode.insertBefore(badge, title.nextSibling);
    else host.appendChild(badge);
    const oldHint = host.querySelector(".exp-level-hint");
    if (oldHint) oldHint.remove();
    const hint = el("p", "exp-level-hint is-" + info.kind);
    hint.textContent = info.hint;
    if (title && title.parentNode) title.parentNode.insertBefore(hint, badge.nextSibling);
  }
  let activeLearningPath = LEARNING_PATHS[0] ? LEARNING_PATHS[0].id : "";
  const TEXTBOOK_BRIDGES = {
    kinematics: { junior: "中学理科：速さ、平均の速さ、運動の記録", senior: "高校物理：直線運動、ベクトル、運動のグラフ", next: "大学の物理：微分と積分で運動を表す", observe: "ほかの条件は変えずに、はじめの量を 1 つだけ変えて、位置・速度・加速度とグラフを見比べます。", exam: "問題文を読んだら、まず正の向きを決めます。それからグラフの傾きや面積を使って、文章の内容を物理量に置きかえます。" },
    newton: { junior: "中学理科：力、摩擦力、身のまわりの運動", senior: "高校物理：運動の法則、力の図示、力のつり合い", next: "大学の力学：自由度の多い系とラグランジュの方法", observe: "まず力の向きを 1 つずつ確認し、外力・質量・摩擦力を変えて、加速度やつり合いがどう変わるかを見ます。", exam: "まず力を図に描き、座標軸を決めてから運動方程式を立てます。摩擦力の向きは、すべろうとする向きから判断します。" },
    momentum: { junior: "中学理科：衝突、作用・反作用、衝撃をやわらげるしくみ", senior: "高校物理：運動量、力積、衝突と保存則", next: "大学の力学：重心系と 2 次元以上の衝突", observe: "衝突の前と後で速度と向きを比べます。どこまでを系とするか決めてから、合計が変わるかどうかを見ます。", exam: "衝突の間、外力の力積を無視できるかをまず判断します。保存されるのは系全体の運動量で、物体 1 つ 1 つの運動量とは限りません。" },
    energy: { junior: "中学理科：エネルギーの変換、仕事、道具のしくみ", senior: "高校物理：仕事とエネルギーの関係、位置エネルギー、力学的エネルギー保存則", next: "大学の力学：保存力、ポテンシャル、エネルギーの一般化", observe: "同じ時刻の運動エネルギー、位置エネルギー、失われたエネルギーを追いかけて、合計が一定かどうかを比べます。", exam: "まず系と基準面を決めます。摩擦や外力、弾性力があるときに、そのまま力学的エネルギー保存則を使えるかを判断します。" },
    gravity: { junior: "中学理科：重力、重さ、天体の観察", senior: "高校物理：円運動、万有引力、人工衛星", next: "大学の力学：軌道、角運動量、二体問題", observe: "速度の向き、加速度の向き、向心力のもとを分けて見ます。それから半径や速さを変えて関係を比べます。", exam: "向心力を新しい種類の力と考えないこと。中心向きの合力になっているのが、どの力なのかを先に見つけます。" },
    shm: { junior: "中学理科：周期的な運動、振り子、ばね", senior: "高校物理：単振動、周期、位相、共振", next: "大学の物理：微分方程式、位相空間、強制振動", observe: "振幅、質量、ばね定数を変えたあと、位置・速度・エネルギーと時間のグラフの位相の関係を同時に見ます。", exam: "まずつり合いの位置と復元力の向きを確認し、周期・振幅・位相から問題で聞かれている量を読み取ります。" },
    thermal: { junior: "中学理科：温度、熱の伝わり方、状態変化", senior: "高校物理：熱力学、気体、流体、熱機関", next: "大学の熱力学：状態方程式、エントロピー、不可逆過程", observe: "まず系が熱を吸収するのか放出するのかを区別し、状態量を 1 つ変えて温度・圧力・体積・エネルギーを見比べます。", exam: "まず系の範囲とエネルギーの流れを書きます。熱、温度、内部エネルギーは別の量で、単位も保存の条件も違います。" },
    waves: { junior: "中学理科：波、音、振動", senior: "高校物理：波の速さ、重ね合わせ、干渉、定常波、ドップラー効果", next: "大学の物理：フーリエ解析、波動方程式、スペクトル", observe: "媒質の条件を固定してから振動数・振幅・位相を変え、波長、節、合成波の変化を見ます。", exam: "まず v = fλ を書き、どの量が波源で決まり、どの量が媒質で決まるかを問題から判断します。" },
    optics: { junior: "中学理科：光の直進、反射、屈折、光の色", senior: "高校物理：幾何光学、干渉、回折、偏光", next: "大学の光学：波面、近距離での回折、スペクトル", observe: "光源、器具の位置、波長を変えて、光の道すじ、像の位置、しま模様、光の強さの分布を見比べます。", exam: "まず光線の図や幾何の図を描き、わかっている距離と角度を書き込みます。そのうえで、像の公式、屈折の法則、波の関係のどれを使うか決めます。" },
    electric: { junior: "中学理科：電流、電圧、抵抗、身のまわりの回路", senior: "高校物理：電場、直流回路、コンデンサー、交流回路", next: "大学の電磁気学：微分方程式、周波数応答、信号処理", observe: "部品か電源の値を 1 つだけ変え、電圧・電流・グラフを同時に読んで、原因と結果の関係を見つけます。", exam: "まず電流の向き、分岐点、測る位置を書き込みます。直列・並列、キルヒホッフの法則、エネルギーの考え方は、回路の形に合わせて使い分けます。" },
    magnetism: { junior: "中学理科：磁石、磁界、電流がつくる磁界", senior: "高校物理：電流が磁場から受ける力、電磁誘導、モーター、発電機", next: "大学の電磁気学：場の重ね合わせ、ビオ・サバールの法則、誘導の式", observe: "電流、磁場、動く向きを切り替えて、ベクトル、針、誘導起電力の向きを先に予想してから確かめます。", exam: "向きを問う問題はまず右ねじの法則やフレミングの左手の法則、レンツの法則を使い、大きさの問題では角度と磁場の中にある長さを代入します。" },
    modern: { junior: "中学理科：原子、放射線、スペクトル、宇宙の観察", senior: "高校物理：光電効果、原子模型、原子核、相対性理論", next: "大学の現代物理：量子状態、エネルギー準位、確率による解釈", observe: "エネルギーの大きさ、波長、量子数を変えて、測定値にしきい値があるか、とびとびになるか、確率的に散らばるかを見ます。", exam: "まず、保存則、量子化、相対論、統計のどの問題なのかを見分けます。ミクロな現象がばらつくのは、公式が成り立たないからではありません。" }
  };
  // 離開模組時用三題收束概念；題目刻意著重判斷與模型，不要求背誦公式。
  const MODULE_CHECKPOINTS = {
    kinematics: [
      { prompt: "速度－時間グラフで、グラフの傾きはどの物理量を表しますか？", choices: ["変位", "加速度", "平均の速さ", "質量"], correct: 1, explanation: "速度がどれだけ速く変わるかが加速度なので、v-t グラフの傾きは加速度です。変位に対応するのはグラフの下の面積です。" },
      { prompt: "空気抵抗を無視して、質量の違う物体を同じ高さから同時に落とすとどうなりますか？", choices: ["重いほうが先に着く", "軽いほうが先に着く", "同時に着く", "物体の体積による"], correct: 2, explanation: "自由落下の加速度はどれも g です。質量は重力と慣性の両方に効くので、落ちる時間には影響しません。" },
      { prompt: "水平な地面での放物運動は、どの 2 つの独立した運動に分けるとよいですか？", choices: ["水平方向は等速、鉛直方向は等加速度", "水平方向は等加速度、鉛直方向は等速", "どちらの方向も等速", "どちらの方向も円運動"], correct: 0, explanation: "空気抵抗を無視すると、水平方向には合力がなく、鉛直方向は重力だけなので、2 つの方向を別々に考えられます。" }
    ],
    newton: [
      { prompt: "物体が粗い壁に押しつけられて静止しているとき、壁からの静止摩擦力はふつうどうなっていますか？", choices: ["いつも μsN に等しい", "ちょうど重力とつり合っていて、最大値とは限らない", "必ず 0", "向きは必ず下向き"], correct: 1, explanation: "静止摩擦力は最大摩擦力の範囲内で大きさが変わります。止まっているときは、上向きに重力とつり合っていることが多いです。" },
      { prompt: "運動方程式の F は何を表していますか？", choices: ["いちばん大きい 1 つの力", "物体が受ける合力", "重力", "摩擦力"], correct: 1, explanation: "F = ma の F は、すべての外力のベクトル和です。力を図に描いてから、方向ごとに合力を書きます。" },
      { prompt: "作用と反作用について正しいものはどれですか？", choices: ["どちらも同じ物体にはたらく", "大きさが等しく向きが反対で、別々の物体にはたらく", "打ち消し合うので物体を動かせない", "止まっている物体だけにある"], correct: 1, explanation: "作用と反作用はそれぞれ別の物体にはたらくので、1 つの物体の力の図の中で打ち消し合うことはありません。" }
    ],
    momentum: [
      { prompt: "衝突のあいだに系が受ける外力の力積を無視できるとき、保存されるのはどれですか？", choices: ["それぞれの物体の運動量", "系全体の運動量", "系の運動エネルギー", "それぞれの物体の速度"], correct: 1, explanation: "外力の力積を無視できれば、系全体の運動量は保存されます。物体 1 つ 1 つの運動量や速度は変わってもかまいません。" },
      { prompt: "力－時間グラフの下の面積は何を表しますか？", choices: ["仕事", "運動量", "力積", "仕事率"], correct: 2, explanation: "力積 J = FΔt は運動量の変化 Δp に等しく、F-t グラフではグラフの下の面積になります。" },
      { prompt: "完全非弾性衝突で 2 つの物体がくっついたとき、ふつう正しいのはどれですか？", choices: ["運動量の和も運動エネルギーの和も保存される", "運動量の和だけが保存される", "運動エネルギーの和だけが保存される", "どちらも保存されない"], correct: 1, explanation: "くっつくと運動エネルギーの一部が内部エネルギーや音、変形のエネルギーに変わります。それでも外力を無視できれば、運動量の和は保存されます。" }
    ],
    energy: [
      { prompt: "物体にされた仕事の合計は、どの量の変化に等しいですか？", choices: ["位置エネルギー", "運動エネルギー", "質量", "運動量"], correct: 1, explanation: "仕事と運動エネルギーの関係 W = ΔK から、合力がした仕事がそのまま運動エネルギーの変化になります。" },
      { prompt: "摩擦があるとき、力学的エネルギーが減るのは、ふつうエネルギーが何に変わったからですか？", choices: ["熱と内部エネルギー", "質量", "電荷", "完全に消えた"], correct: 0, explanation: "エネルギーはなくなりません。摩擦によって、目に見える力学的エネルギーが内部エネルギーや音など、取り出しにくい形に変わります。" },
      { prompt: "保存力だけがはたらくとき、物体が高い所からすべり下りるとどうなりますか？", choices: ["位置エネルギーが増え、運動エネルギーが減る", "位置エネルギーが減り、運動エネルギーが増え、力学的エネルギーの和は変わらない", "力学的エネルギーの和は必ず増える", "速度は変わらない"], correct: 1, explanation: "重力による位置エネルギーが運動エネルギーに変わります。保存力以外の力が仕事をしなければ、2 つの和は一定です。" }
    ],
    gravity: [
      { prompt: "円運動の「向心力」の意味として最も正しいものはどれですか？", choices: ["別にある新しい力", "中心を向く実際の力の合力", "いつも重力に等しい", "いつも速度と同じ向き"], correct: 1, explanation: "向心力は別の種類の力ではなく、「向心加速度を生む合力」の呼び名です。張力、摩擦力、重力などがその役をします。" },
      { prompt: "人工衛星が地球のまわりを回るとき、向心力のおもなもとは何ですか？", choices: ["エンジンの推力", "地球の万有引力", "遠心力", "空気抵抗"], correct: 1, explanation: "衛星はずっと地球に向かって落ち続けていて、万有引力が速度の向きを変えることで軌道になります。" },
      { prompt: "2 つの物体の距離を 2 倍にすると、万有引力の大きさははじめの何倍になりますか？", choices: ["2 倍", "1/2", "1/4", "4 倍"], correct: 2, explanation: "万有引力は距離の 2 乗に反比例します（F ∝ 1/r²）。距離が 2 倍になると、力は 4 分の 1 になります。" }
    ],
    shm: [
      { prompt: "単振動のつり合いの位置にはどんな特徴がありますか？", choices: ["速度は必ず 0", "復元力が 0", "位置エネルギーが必ず最大", "加速度が必ず最大"], correct: 1, explanation: "つり合いの位置は復元力が 0 になる位置です。ここを通るとき、速さはふつう最大になります。" },
      { prompt: "理想的なばね振り子の周期は T = 2π√(m/k) です。振幅が小さいとき、周期に関係しないのはどれですか？", choices: ["質量", "ばね定数", "振幅", "m と k の比"], correct: 2, explanation: "理想的な単振動では、周期は質量とばね定数で決まり、振幅を変えても周期は変わりません。" },
      { prompt: "強制振動で共振が起こりやすい条件はどれですか？", choices: ["外から加える振動数が固有振動数に近い", "振幅が 0", "外力がまったくない", "質量が無限に大きい"], correct: 0, explanation: "外力がエネルギーを与えるリズムが固有振動数に近いと、エネルギーが効率よくたまり、振幅が大きくなります。" }
    ],
    thermal: [
      { prompt: "温度の違う 2 つの物体を接触させると、熱は自然にどちら向きに移りますか？", choices: ["低温から高温", "高温から低温", "必ず両方向に同じだけ", "温度とは関係ない"], correct: 1, explanation: "外から仕事を加えなければ、エネルギーは熱として高温の物体から低温の物体へ移り、熱平衡になるまで続きます。" },
      { prompt: "温度と熱量の違いを最もよく表しているのはどれですか？", choices: ["どちらもエネルギーの単位", "温度は状態を表し、熱量は温度差によって移るエネルギー", "熱量は固体にしかない", "温度が高いほど質量は必ず大きい"], correct: 1, explanation: "温度は系の状態を表す量で、熱量はエネルギーが系の境界をこえて移る形の 1 つです。" },
      { prompt: "純物質がとけたり沸騰したりしているあいだ、熱を吸収し続けても温度はふつうどうなりますか？", choices: ["上がり続ける", "下がり続ける", "ほぼ一定", "必ず 0 になる"], correct: 2, explanation: "状態変化のあいだに吸収したエネルギーは、おもに分子の並び方や分子間の位置エネルギーを変えるのに使われます。これを潜熱といいます。" }
    ],
    waves: [
      { prompt: "波の速さ、振動数、波長の関係式はどれですか？", choices: ["v = fλ", "v = f/λ", "v = λ/f", "f = vλ"], correct: 0, explanation: "1 秒間に f 個の波長分が通り、1 波長の長さが λ なので、波の速さは v = fλ です。" },
      { prompt: "同じひもの張力と線密度を変えずに波源の振動数を変えたとき、変わらないのはどれですか？", choices: ["波の速さ", "波長", "周期", "節の数"], correct: 0, explanation: "波の速さは媒質の性質で決まります。振動数を上げると、v = fλ を保つように波長が短くなります。" },
      { prompt: "同位相で振幅の近い 2 つの波が同じ場所で出会うと、何が起こりやすいですか？", choices: ["強め合う干渉で振幅が大きくなる", "完全に消えた", "波が止まる", "振動数が 0 になる"], correct: 0, explanation: "同位相なら山と山、谷と谷が重なって変位が足し合わされ、強め合います。" }
    ],
    optics: [
      { prompt: "光が空気からガラスに斜めに入ると、屈折した光はふつうどうなりますか？", choices: ["法線から遠ざかる", "法線に近づく", "境界面に沿って進む", "進まなくなる"], correct: 1, explanation: "屈折率の大きい媒質に入ると光の速さが小さくなり、屈折の法則から屈折角が小さくなるので、法線に近づきます。" },
      { prompt: "二重スリットの干渉じまの間隔 Δx に比例するのはどれですか？", choices: ["スリットの間隔 d", "スクリーンまでの距離 L", "スリットの数", "光の強さ"], correct: 1, explanation: "Δx = λL/d なので、スクリーンが遠いほど、また波長が長いほど、しまの間隔は広くなります。" },
      { prompt: "凸レンズで遠くの物体の像を紙のスクリーンに映したとき、像はふつうどうなっていますか？", choices: ["正立の虚像", "倒立の実像", "像はできない", "色のついた影だけ"], correct: 1, explanation: "スクリーンに映せるのは必ず実像です。凸レンズで遠くの物体にピントを合わせると倒立の実像ができます。" }
    ],
    electric: [
      { prompt: "直列回路で、それぞれの部品を流れる電流の大きさはふつうどうなっていますか？", choices: ["同じ", "抵抗に比例する", "すべて 0", "分岐点を通るたびに増える"], correct: 0, explanation: "直列回路は道が 1 本だけなので、定常状態ではどの断面を 1 秒間に通る電荷も同じで、電流は等しくなります。" },
      { prompt: "オームの法則が成り立つ抵抗で、電圧と電流の関係はどれですか？", choices: ["U = IR", "U = I/R", "U = R/I", "U と I は関係ない"], correct: 0, explanation: "温度などの条件がほぼ一定なら、電圧 U は電流 I に比例し、比例定数が抵抗 R です。" },
      { prompt: "電圧計を回路に正しくつなぐには、ふつうどうしますか？", choices: ["測りたい部品と直列につなぐ", "測りたい部品と並列につなぐ", "電源の両端に直接つなぐ", "どこにつないでも同じ"], correct: 1, explanation: "電圧計は両端の電位差を測る器具で、内部抵抗がとても大きいので、測りたい部品の両端に並列につなぎます。" }
    ],
    magnetism: [
      { prompt: "導体に誘導起電力が生じるために必要な条件はどれですか？", choices: ["磁束が変化する", "磁場が止まっていて相対運動もない", "抵抗が 0", "導体が閉じた回路になっていない"], correct: 0, explanation: "ファラデーの電磁誘導の法則から、誘導起電力は磁束の変化から生じます。閉じた回路になっていれば、測れる誘導電流が流れます。" },
      { prompt: "レンツの法則が表している誘導電流の向きはどれですか？", choices: ["いつも元の磁束の変化を強める", "磁束の変化を妨げる", "磁場の向きとは関係ない", "いつも時計回り"], correct: 1, explanation: "誘導の効果は、その原因になった磁束の変化に逆らう向きに生じます。これはエネルギー保存則の表れです。" },
      { prompt: "一様な磁場の中で電流が流れる導線が受ける力は F = BIL sinθ です。最大になるのはいつですか？", choices: ["導線が磁場と平行", "導線が磁場と垂直", "電流が 0", "磁場が 0"], correct: 1, explanation: "sin 90° = 1 なので、電流の向きが磁場と垂直のとき、電流が磁場から受ける力が最大になります。" }
    ],
    modern: [
      { prompt: "光電効果で、光を強くしても電子が飛び出さないのはどんなときですか？", choices: ["振動数が限界振動数より小さい", "振動数が限界振動数より大きい", "金属の表面がなめらか", "電子の数が多すぎる"], correct: 0, explanation: "光子 1 個のエネルギーは E = hf です。振動数が限界値より小さいと、どの光子も仕事関数をこえるエネルギーを持ちません。" },
      { prompt: "原子のスペクトルがとびとびの線になることは、何を最もよく表していますか？", choices: ["エネルギー準位がとびとびであること", "エネルギーはすべて連続", "光の速さが色によって大きく違う", "電子が完全に止まっている"], correct: 0, explanation: "電子は決まったエネルギー準位のあいだでしか移れないので、吸収・放出する光子のエネルギーもとびとびの値になります。" },
      { prompt: "放射性崩壊について正しいものはどれですか？", choices: ["どの原子も決まった時刻に崩壊する", "1 回の崩壊を正確に予測できる", "たくさんの原子は、予測できる半減期の統計的な規則にしたがう", "試料の量を 2 倍にすると半減期も 2 倍になる"], correct: 2, explanation: "1 個の原子がいつ崩壊するかはランダムですが、たくさん集まると、安定した指数関数的な減少と半減期が現れます。" }
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
      console.error("物理実験室：単元データのチェックに失敗", audit);
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
    if (missingModules.length || invalidQuestions.length) console.error("単元チェックの問題データのチェックに失敗", audit);
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
  /* 站台設定（js/site-config.js） */
  const SITE = window.PhysicsLabSite || {};

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
  /*
   * 新版上線、但這個分頁還沒重新整理（見 startApp 的 controllerchange）。
   * sw.js 用 skipWaiting＋clients.claim，新版一裝好就接管已開著的分頁；記憶體裡還是舊的引擎，
   * 之後延遲載入的實驗檔卻會從網路拿到新版（靜態主機不看 ?v=）——舊引擎配新實驗檔可能直接壞掉。
   * 這時要載任何新檔案，就改成整頁重新整理（網址的 #實驗 會保留，等於直接開新版的那個實驗）。
   */
  let updatePending = false;

  function loadScript(src) {
    if (loadedFiles.has(src)) return loadedFiles.get(src);
    if (updatePending) { location.reload(); return new Promise(() => {}); }
    const promise = new Promise((resolve, reject) => {
      const tag = document.createElement("script");
      tag.src = src;
      tag.async = false;              // 保持執行順序，避免相依性問題
      tag.onload = () => resolve(src);
      tag.onerror = () => reject(new Error("読み込みに失敗：" + src));
      document.head.appendChild(tag);
    });
    loadedFiles.set(src, promise);
    return promise;
  }

  /* 確保某個實驗的程式碼已經就緒 */
    /*
   * 器材繪製層（sim-apparatus.js）跟實驗程式一樣是延遲載入的。
   *
   * 理由和實驗檔完全相同：首頁不跑任何模擬，卻要學生先把整個器材庫下載完，
   * 等於把省下來的流量又花掉。它只在第一個實驗真正要開啟前才載入，
   * 之後留在 PL.apparatus 上供所有實驗共用。
   */
  let apparatusPromise = null;
  function ensureApparatus() {
    if (PL.apparatus) return Promise.resolve(true);
    if (!apparatusPromise) {
      const build = (window.PhysicsLabSite && window.PhysicsLabSite.build) || "";
      /*
       * 觀察點引擎（sim-observe.js）也跟著器材層一起載：它只在實驗建置時才有事做，
       * 而且一定要在第一個實驗建置「之前」掛上鉤子——器材層剛好也是建置前必等的那一步。
       */
      const v = build ? "?v=" + build : "";
      /*
       * 量測工具、洞察、教師提示、無障礙這四支也只在實驗建置時掛鉤子（PL._hooks），首頁用不到，
       * 一起改成延遲載入：首次載入少約 42 KB gzip。順序維持原本 index.html 的順序（鉤子依註冊順序執行）。
       */
      const addons = ["sim-tools", "sim-insight", "teaching-notes", "sim-a11y", "sim-record"].map(f => loadScript("js/" + f + ".js" + v).catch(err => { console.warn(err); }));
      apparatusPromise = Promise.all(addons.concat([loadScript("js/sim-apparatus.js" + v), loadScript("js/sim-observe.js" + v).catch(err => { console.warn(err); })]))
        .then(() => true)
        .catch(err => { console.error(err); apparatusPromise = null; return false; });
    }
    return apparatusPromise;
  }

  /*
   * 題庫（question-bank.js）也走延遲載入。
   *
   * 它只有「題目練習」這一區用得到，但卻是核心腳本裡最重的一份之一；
   * 留在首屏等於讓每個只看模擬的學生都先付這筆流量。改成第一次要渲染
   * 題目時才載（SW 仍會預先快取，第二次起等同本地）。
   */
  let questionBankPromise = null;
  function ensureQuestionBank() {
    if (window.PhysicsLabQuestionBank) return Promise.resolve(true);
    if (!questionBankPromise) {
      const build = (window.PhysicsLabSite && window.PhysicsLabSite.build) || "";
      questionBankPromise = loadScript("js/question-bank.js" + (build ? "?v=" + build : ""))
        .then(() => true)
        .catch(err => { console.error(err); questionBankPromise = null; return false; });
    }
    return questionBankPromise;
  }

  function ensureExperiment(id) {
    if (PL.has(id)) return ensureApparatus().then(() => true);
    const file = EXPERIMENT_FILES[id];
    if (!file) return Promise.resolve(false);
    const build = (window.PhysicsLabSite && window.PhysicsLabSite.build) || "";
    return ensureApparatus()
      .then(() => loadScript("js/experiments/" + file + (build ? "?v=" + build : "")))
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
    idle(() => {
      if (updatePending) return;   // 預先抓檔會觸發整頁重新整理（見 loadScript），等使用者自己換頁
      [order - 1, order + 1].forEach(i => {
        const item = FLAT[i];
        if (!item || PL.has(item.exp.id)) return;
        const file = EXPERIMENT_FILES[item.exp.id];
        // 一定要帶版本號：js/ 是一年 immutable 快取，不帶版本的網址部署後會拿到舊程式，
        // 而且和 ensureExperiment() 的網址不同，兩邊都載就會把同一支檔案執行兩次。
        const build = (window.PhysicsLabSite && window.PhysicsLabSite.build) || "";
        if (file) loadScript("js/experiments/" + file + (build ? "?v=" + build : "")).catch(() => {});
      });
    });
  }

  /* ------------------------------- 主題 ------------------------------- */
  // 第一次造訪預設亮色：實驗室場景是為明亮的實驗檯設計的，深色改成手動選項。
  function preferredTheme() {
    const saved = store.get("pl-theme", null);
    if (saved === "light" || saved === "dark") return saved;
    return "light";
  }

  /*
   * 收合／展開左側課程目錄。
   *
   * canvas 的像素尺寸是用容器寬度算出來的，而引擎在畫布容器上掛了 ResizeObserver，
   * 所以收合造成的寬度變化正常情況下會自己被接住。
   * 這裡仍補一次重繪當作保險：如果哪天漏掉，症狀會是畫布維持收合前的寬度、
   * 右邊留一條空白——而那看起來很像「這個實驗本來就畫不滿」，
   * 不會有人想到是尺寸沒更新。這種靜默的失敗值得多花一次重繪。
   *
   * 用 requestAnimationFrame 等一格，是要先讓瀏覽器完成重新排版，
   * 這時量到的容器寬度才是收合後的值。
   */
  function applySidebarCollapsed(collapsed) {
    const app = document.querySelector(".app");
    if (!app) return;
    if (collapsed) app.setAttribute("data-sidebar", "collapsed");
    else app.removeAttribute("data-sidebar");
    store.set("pl-sidebar-collapsed", !!collapsed);

    const btn = $("#sidebar-toggle");
    if (btn) {
      // 箭頭方向由 CSS 依 data-sidebar 反轉，這裡只更新無障礙標籤。
      btn.setAttribute("aria-expanded", String(!collapsed));
      btn.setAttribute("aria-label", collapsed ? "単元一覧を開く" : "単元一覧をたたむ");
      btn.title = collapsed ? "単元一覧を開く" : "単元一覧をたたんで実験台を広げる";
    }
    requestAnimationFrame(() => {
      if (currentSim && currentSim.rerender) {
        try { currentSim.rerender(); } catch (e) { console.warn("サイドバーをたたんだあとの再描画に失敗", e); }
      }
    });
  }

  function applyTheme(t) {
    const theme = t === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", theme);
    store.set("pl-theme", theme);
    const stageTheme = $("#stage-theme");
    if (stageTheme) {
      stageTheme.innerHTML = (theme === "light" ? moonIcon : sunIcon) + "<span>" + (theme === "light" ? "ダーク" : "ライト") + "</span>";
      stageTheme.setAttribute("aria-label", theme === "light" ? "ダークテーマに切り替え" : "ライトテーマに切り替え");
    }
    const btn = $("#theme-toggle");
    if (btn) {
      btn.innerHTML = theme === "light" ? moonIcon + "<span>ダーク</span>" : sunIcon + "<span>ライト</span>";
      btn.title = theme === "light" ? "ダークテーマに切り替え" : "ライトテーマに切り替え";
      // 名稱要包含按鈕上看得到的「深色／淺色」（WCAG 2.5.3）；名稱已經說明動作，不再另加 aria-pressed
      btn.setAttribute("aria-label", btn.title);
      btn.removeAttribute("aria-pressed");
    }
    // 行動裝置的網址列顏色也要跟著換，否則淺色頁面上方會頂著一條深色。
    document.querySelectorAll('meta[name="theme-color"]').forEach(meta => meta.remove());
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = theme === "light" ? "#eef2f8" : "#13171c";
    document.head.appendChild(meta);
    // 主題切換後重繪目前模擬
    if (currentSim && currentSim.rerender) {
      try { currentSim.rerender(); } catch (e) { console.warn("テーマ切り替え後の再描画に失敗", e); }
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
        if (e.interactive) { const tag = el("span", "tag-int", item); tag.textContent = "操作"; }
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
    button.setAttribute("aria-label", "実験を開く：" + target.exp.title);
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
    const eyebrow = el("span", "exp-path-eyebrow", heading); eyebrow.textContent = "つながり · " + context.path.title;
    const summary = el("span", "exp-path-summary", heading);
    summary.textContent = context.current.stage.level + " · 第 " + (context.current.indexInStage + 1) + " 段階";

    const steps = el("div", "exp-path-steps", root);
    const previous = context.sequence[context.index - 1];
    const next = context.sequence[context.index + 1];
    if (previous && byId[previous.id]) makeExperimentPathStep(steps, "前の段階", byId[previous.id], false);
    makeExperimentPathStep(steps, "いま", byId[id], true);
    if (next && byId[next.id]) makeExperimentPathStep(steps, "次の段階", byId[next.id], false);
  }

  function renderLearningOutput(f) {
    const root = $("#learning-output");
    if (!root) return;
    const { exp, mod } = f;
    const bridge = TEXTBOOK_BRIDGES[mod.id] || {
      junior: "中学理科：身のまわりの現象から感覚をつかむ", senior: "高校物理：モデル、グラフ、測定で関係を見つける", next: "大学の入門：もっと一般的な数学のモデルへ広げる", observe: "条件を 1 つずつ変えて、測定値、グラフ、現象を見比べます。", exam: "問題の場面をまず物理量と式に置きかえてから、合うモデルを選びます。"
    };
    root.innerHTML = "";

    const heading = el("div", "learning-output-heading", root);
    const eyebrow = el("span", "learning-output-eyebrow", heading); eyebrow.textContent = "ふり返り · 今回の実験";
    const title = el("h3", "learning-output-title", heading); title.textContent = "動かしてみて、何がわかりましたか？";
    const intro = el("p", "learning-output-intro", heading); intro.textContent = "いま操作したこと、教科書の考え方、問題の解き方をつなげます。";

    /*
     * 學習閉環只留「其他地方沒有」的內容（2026-10 整理）：
     * 原本的「01 操作時先看」和實驗台上方的任務導讀重複；
     * 「03 玩完能帶走」直接取 exp.points 前三條，和右欄的「學習重點」一字不差。
     * 留下課本銜接、解題轉換與一句話結論。
     */
    const grid = el("div", "learning-output-grid", root);
    const textbook = el("article", "learning-output-step textbook", grid);
    const textbookNo = el("span", "learning-output-no", textbook); textbookNo.textContent = "教科書のどこにつながるか";
    const textbookList = el("dl", "textbook-bridge", textbook);
    [["中学理科の基礎", bridge.junior], ["高校の教科書", bridge.senior], ["大学への発展", bridge.next]].forEach(([label, text]) => {
      const row = el("div", "textbook-bridge-row", textbookList);
      const term = el("dt", null, row); term.textContent = label;
      const desc = el("dd", null, row); desc.textContent = text;
    });

    const transfer = el("div", "learning-transfer", root);
    const transferLabel = el("span", "learning-transfer-label", transfer); transferLabel.textContent = "問題を解くときの考え方";
    const transferCopy = el("p", "learning-transfer-copy", transfer); transferCopy.textContent = bridge.exam;

    const reflection = el("div", "learning-reflection", root);
    const reflectionHead = el("div", "learning-reflection-head", reflection);
    const label = el("label", "learning-reflection-label", reflectionHead); label.htmlFor = "learning-reflection-input"; label.textContent = "ひとことでまとめると";
    const prompt = el("p", "learning-reflection-prompt", reflectionHead);
    prompt.textContent = "パラメータを 1 つ変えたあと、「" + (exp.points[0] || exp.title) + "」を使って、測定値やグラフが変わった理由を説明してください。";
    const input = el("textarea", "learning-reflection-input", reflection); input.id = "learning-reflection-input"; input.maxLength = 240;
    input.placeholder = "気づいたことと、その理由を書いてください…";
    input.value = store.get("pl-reflection-" + exp.id, "");
    const actions = el("div", "learning-reflection-actions", reflection);
    const saved = el("span", "learning-reflection-saved", actions); saved.textContent = input.value ? "この端末に保存しました" : "";
    const save = el("button", "learning-reflection-save", actions); save.type = "button"; save.textContent = "保存する";
    save.addEventListener("click", () => {
      store.set("pl-reflection-" + exp.id, input.value.trim());
      saved.textContent = input.value.trim() ? "この端末に保存しました" : "このまとめを消しました";
    });
  }

  function buildHome() {
    const heroExperimentCount = $("#hero-exp-count");
    if (heroExperimentCount) heroExperimentCount.textContent = C.totalExperiments;
    const grid = $("#module-grid");
    grid.innerHTML = "";
    /*
     * 模組卡（2026-10 改版）：大號序號＋模組色細線＋個人進度條。
     * 卡片本身就是入口，所以給它按鈕語意與鍵盤操作——原本是純 div，Tab 走不到。
     */
    const arrowSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
    C.modules.forEach((m, index) => {
      const card = el("div", "mcard", grid);
      card.style.setProperty("--m-color", m.color);
      card.dataset.mod = m.id;
      card.setAttribute("role", "link");
      card.setAttribute("tabindex", "0");
      /*
       * 不另設 aria-label，名稱直接取卡片上看得到的字（序號、課綱、標題、說明、進度）。
       * 以前是「模組 1：…，N 個實驗」，和畫面上的「01 …」對不起來（WCAG 2.5.3 Label in Name）：
       * 語音控制的使用者照著畫面念，叫不到這張卡。
       */
      const top = el("div", "mcard-top", card);
      const no = el("div", "mcard-no", top); no.textContent = String(index + 1).padStart(2, "0");
      const tr = el("div", "mcard-track", top); tr.textContent = m.track;
      const ti = el("div", "mcard-title", card); ti.textContent = m.title;
      const intro = el("div", "mcard-intro", card); intro.textContent = m.intro;
      const meta = el("div", "mcard-meta", card);
      meta.innerHTML = '<span class="mcard-count"><b>' + m.experiments.length + '</b> 実験</span>' +
        '<span class="mcard-progress" aria-hidden="true"><i></i></span>' +
        '<span class="mcard-done">0 / ' + m.experiments.length + '</span>' +
        '<span class="mcard-go">' + arrowSvg + '</span>';
      const open = () => {
        const first = m.experiments.find(exp => !viewed.has(exp.id)) || m.experiments[0];
        location.hash = "#" + first.id;
      };
      card.addEventListener("click", open);
      card.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
      });
    });
    refreshHomeProgress();
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

  /*
   * MathJax 載不到時的退路
   *
   * 由來：MathJax 從 cdn.jsdelivr.net 載，而 Service Worker 對跨網域資源
   * 是「網路優先、失敗看快取」——但那份快取從來沒被寫入過，所以離線時必定失敗。
   * 失敗時 typeset() 只是把節點丟進 pendingTypeset 等一個永遠不會來的事件，
   * 畫面上就留著 \(T \propto \sqrt{L}\) 這種原始碼。首頁 hero 就有兩處，
   * 等於主打「離線可用」的 PWA 一離線就先讓學生看到壞掉的字串。
   *
   * 這裡把 tools/build-static.js 為靜態頁寫的同一套 LaTeX→純文字轉換
   * 縮成瀏覽器版：載不到就退成「T ∝ √L」，讀得懂，也不會看起來像壞掉。
   */
  const GREEK = {
    pi: "π", theta: "θ", lambda: "λ", mu: "μ", rho: "ρ", alpha: "α", beta: "β",
    gamma: "γ", Delta: "Δ", delta: "δ", omega: "ω", Omega: "Ω", sigma: "σ",
    varepsilon: "ε", epsilon: "ε", phi: "φ", tau: "τ", nu: "ν", eta: "η",
    kappa: "κ", psi: "ψ", varphi: "φ", xi: "ξ", zeta: "ζ", chi: "χ",
    Gamma: "Γ", Lambda: "Λ", Phi: "Φ", Psi: "Ψ", Sigma: "Σ", Theta: "Θ", Pi: "Π"
  };
  const SYM = {
    propto: "∝", times: "×", cdot: "·", pm: "±", approx: "≈", neq: "≠",
    leq: "≤", geq: "≥", ll: "≪", gg: "≫", to: "→", Rightarrow: "⇒",
    infty: "∞", quad: " ", qquad: "  ", left: "", right: "", displaystyle: "",
    mathrm: "", text: "", ldots: "…", cdots: "⋯", dots: "…",
    // 2026-11 補齊：以前沒有的指令直接被吃掉，⇌、↑↓ 這些箭頭在離線時整個消失
    leftarrow: "←", leftrightarrow: "↔", rightleftharpoons: "⇌", leftrightarrows: "⇄",
    uparrow: "↑", downarrow: "↓", mp: "∓", equiv: "≡", sim: "∼", supset: "⊃", perp: "⊥",
    parallel: "∥", mid: "|", oplus: "⊕", nabla: "∇", oint: "∮", langle: "⟨", rangle: "⟩"
  };
  const ACCENT = { vec: "\u20d7", bar: "\u0304", tilde: "\u0303", dot: "\u0307", hat: "\u0302", overline: "\u0305" };
  const OPERATOR = new Set(["∝", "×", "·", "±", "≈", "≠", "≤", "≥", "≪", "≫", "→", "⇒", "←", "↔", "⇌", "⇄", "≡", "⊃", "⊥", "|"]);
  const SUP = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "+": "⁺", "-": "⁻", n: "ⁿ", i: "ⁱ" };
  const SUB = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉", "+": "₊", "-": "₋" };
  const isAtomic = s => /^[A-Za-z0-9ℏℓπθλμρσταβγδεφωνηΔΩ]+$/.test(s);

  // 從 index（必須是 "{"）讀出成對的大括號內容；分子分母本身會含大括號，
  // 所以必須數深度，不能用正規表示式。
  function readGroup(src, index) {
    if (src[index] !== "{") return null;
    let depth = 0;
    for (let i = index; i < src.length; i++) {
      if (src[i] === "{") depth++;
      else if (src[i] === "}" && --depth === 0) return { body: src.slice(index + 1, i), end: i + 1 };
    }
    return null;
  }
  function fraction(a, b) {
    if (isAtomic(a) && isAtomic(b)) return a + "/" + b;
    return "(" + (isAtomic(a) ? a : "(" + a + ")") + "/" + (isAtomic(b) ? b : "(" + b + ")") + ")";
  }
  function mapScript(body, table) {
    let out = "";
    for (const ch of body) { if (!table[ch]) return null; out += table[ch]; }
    return out;
  }
  function plainFormula(latex) {
    const src = String(latex || "");
    let out = "", i = 0;
    while (i < src.length) {
      const ch = src[i];
      if (ch === "\\") {
        const m = /^[A-Za-z]+/.exec(src.slice(i + 1));
        if (!m) { i += 2; continue; }
        const name = m[0];
        let j = i + 1 + name.length;
        while (src[j] === " ") j++;
        if (name === "dfrac" || name === "frac" || name === "tfrac") {
          const a = readGroup(src, j); if (!a) { i = j; continue; }
          const b = readGroup(src, a.end); if (!b) { i = a.end; continue; }
          out += fraction(plainFormula(a.body), plainFormula(b.body)); i = b.end; continue;
        }
        if (name === "sqrt") {
          const a = readGroup(src, j);
          if (a) { out += "√" + (isAtomic(a.body) ? plainFormula(a.body) : "(" + plainFormula(a.body) + ")"); i = a.end; continue; }
        }
        if (name === "mathrm" || name === "text") {
          const a = readGroup(src, j);
          if (a) { out += a.body.replace(/\\[,;: ]/g, " ").replace(/\\!/g, "").replace(/\\([A-Za-z]+) ?/g, (m, n) => SYM[n] != null ? SYM[n] : GREEK[n] || m); i = a.end; continue; }
        }
        // \xrightarrow[下]{上} → 「 →(上／下) 」；\overset、\underset → 「符號(上／下)」
        if (name === "xrightarrow") {
          let below = "";
          if (src[j] === "[") { const close = src.indexOf("]", j); below = plainFormula(src.slice(j + 1, close)); j = close + 1; while (src[j] === " ") j++; }
          const a = readGroup(src, j);
          const label = [a ? plainFormula(a.body) : "", below].filter(Boolean).join("／");
          out += " →" + (label ? "(" + label + ")" : "") + " "; i = a ? a.end : j; continue;
        }
        if (name === "overset" || name === "underset") {
          const a = readGroup(src, j), b = a ? readGroup(src, a.end) : null;
          if (a && b) {
            const base = plainFormula(b.body), note = plainFormula(a.body);
            out += base.endsWith(")") && name === "underset" ? base.slice(0, -1) + "／" + note + ")" : base + "(" + note + ")";
            i = b.end; continue;
          }
        }
        if (ACCENT[name]) {
          const a = readGroup(src, j);
          if (a) { out += plainFormula(a.body) + ACCENT[name]; i = a.end; continue; }
          if (/[A-Za-z]/.test(src[j] || "")) { out += src[j] + ACCENT[name]; i = j + 1; continue; }   // \vec B
        }
        // 希臘字母是變數，\Delta P 要黏成 ΔP；運算子則要留空白，∝ √L 才讀得順
        if (GREEK[name]) { out += GREEK[name]; i = j; continue; }
        if (name in SYM) {
          const sym = SYM[name];
          if (sym && OPERATOR.has(sym)) out += (/\s$/.test(out) || !out ? "" : " ") + sym + " ";
          else out += sym;
          i = j; continue;
        }
        out += name; i = j; continue;
      }
      if (ch === "^" && src[i + 1] === "\\") { i += 1; continue; }   // ^\circ：上標的是符號本身
      if (ch === "^" || ch === "_") {
        const table = ch === "^" ? SUP : SUB;
        const g = readGroup(src, i + 1);
        const body = g ? g.body : src[i + 1];
        const mapped = body == null ? null : mapScript(plainFormula(body), table);
        if (mapped != null) { out += mapped; i = g ? g.end : i + 2; continue; }
        out += ch + (g ? "(" + plainFormula(g.body) + ")" : body || "");
        i = g ? g.end : i + 2; continue;
      }
      if (ch === "{" || ch === "}" || ch === "$") { i++; continue; }
      out += ch; i++;
    }
    return out.replace(/\s{2,}/g, " ");
  }

  /* 把節點底下所有文字裡的 \( … \) 與 \[ … \] 換成可讀文字 */
  const MATH_RE = /\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g;
  function renderPlainMath(node) {
    if (!node || !node.nodeType) return;
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null);
    const hits = [];
    let t;
    while ((t = walker.nextNode())) if (t.nodeValue && t.nodeValue.indexOf("\\") >= 0) hits.push(t);
    hits.forEach(n => {
      n.nodeValue = n.nodeValue.replace(MATH_RE, (_, a, b) => plainFormula(a != null ? a : b));
    });
  }

  let mathFailed = false;
  function failMath() {
    if (mathFailed) return;
    if (window.MathJax && MathJax.typesetPromise) return;   // 只是還沒跑完，不是失敗
    mathFailed = true;
    pendingTypeset.clear();
    renderPlainMath(document.body);
  }
  window.addEventListener("mathjax-failed", failMath);

  /*
   * MathJax 延遲載入（2026-11）
   *
   * 以前 index.html 一打開就 async 載入 tex-svg.js（壓縮後約 660 KB），首頁卻一條公式都沒有。
   * 現在改成第一次有節點真的含公式、要排版時才插入 script：只看首頁、Duo、自訂實驗室的人完全不用付這筆流量。
   * 逾時的計時器也改成從「開始載入」起算，而不是從開站起算——以前首頁停留超過 5 秒才進實驗，
   * MathJax 根本還沒開始抓就被判定失敗。
   */
  const MATHJAX_SRC = "https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-svg.js";
  let mathRequested = false;
  function requestMathJax() {
    if (mathRequested || mathFailed) return;
    mathRequested = true;
    /*
     * 先走 CORS：這樣 Service Worker 才能存成一般回應（不透明回應不能放心快取），離線也能排公式。
     * 但有些校園代理伺服器會拿掉 Access-Control-Allow-Origin，檔案明明抓得到，
     * 瀏覽器卻因為 CORS 檢查失敗而觸發 onerror——公式全部退成純文字。
     * 所以 CORS 失敗時再用一般方式載一次；這次不會被快取，但至少線上排得出來。
     */
    const load = cors => {
      const tag = document.createElement("script");
      tag.src = MATHJAX_SRC;
      tag.async = true;
      if (cors) tag.crossOrigin = "anonymous";
      tag.onerror = () => { tag.remove(); if (cors && !mathFailed) load(false); else failMath(); };
      // 被代理伺服器換成空檔或錯誤頁時 onerror 不會觸發：載完卻沒有 MathJax 本體（version）就當失敗
      tag.onload = () => { if (!(window.MathJax && MathJax.version)) failMath(); };
      document.head.appendChild(tag);
    };
    load(true);
    // 慢速行動網路下載 660 KB 需要數秒，留 15 秒；真正離線時 onerror 會更早觸發
    setTimeout(failMath, 15000);
  }
  const hasMath = node => /\\\(|\\\[|\$\$/.test(node.textContent || "");

  function typeset(node) {
    if (!node) return;
    if (window.MathJax && MathJax.typesetPromise) {
      MathJax.typesetPromise([node]).catch(() => {});
    } else if (mathFailed) {
      renderPlainMath(node);
    } else if (hasMath(node)) {
      pendingTypeset.add(node);
      requestMathJax();
    }
  }

  window.addEventListener("mathjax-ready", () => {
    if (!window.MathJax || !MathJax.typesetPromise || !pendingTypeset.size) return;
    const nodes = [...pendingTypeset].filter(n => n.isConnected);
    pendingTypeset.clear();
    if (nodes.length) MathJax.typesetPromise(nodes).catch(() => {});
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
  function neighbourDistractors(f, count, offset) {
    const siblings = f.mod.experiments.filter(e => e.id !== f.exp.id && Array.isArray(e.points) && e.points.length);
    /*
     * 自己實驗的學習重點一個都不能當誘答：有些主題（如光譜與能階躍遷）
     * 的兄弟實驗會出現相同敘述，若正解與某選項一模一樣，題目就有兩個
     * 正確答案。先把本實驗全部重點集合成 Set，取樣時跳過。
     */
    const own = new Set((f.exp.points || []).map(p => compactText(p, f.exp.title, 72)));
    const picked = [];
    const shift = offset || 0;
    // 以 order 當起點等距取樣，讓同一個實驗每次進來的誘答固定，方便師生討論。
    for (let i = 0; i < siblings.length && picked.length < count; i += 1) {
      const item = siblings[(f.order * 3 + shift + i * 5) % siblings.length];
      const text = compactText(item.points[(f.order + shift + i) % item.points.length], item.title, 72);
      if (text && !picked.includes(text) && !own.has(text)) picked.push(text);
    }
    while (picked.length < count) picked.push("この現象は、実験で測っている物理量とは直接関係しません。");
    return picked;
  }

  /*
   * 手寫題的選項洗牌。題庫裡正解固定寫在第 0 位（撰寫方便），渲染前若不洗牌，
   * 「答案永遠是 A」等於把評量結果送給會看位置的學生。用與計算題同一套
   * 「實驗 + 日期」種子決定順序：同一個學生同一天看到的排列固定，方便檢討。
   */
  function shuffleAuthoredQuestion(q, salt) {
    const hash = questionSeed(String(salt || ""));
    let state = (hash >>> 0) || 1;
    const rand = () => {
      state = (state + 0x9e3779b9) >>> 0;
      let z = state;
      z = Math.imul(z ^ (z >>> 16), 0x21f0aaad) >>> 0;
      z = Math.imul(z ^ (z >>> 15), 0x735a2d97) >>> 0;
      return ((z ^ (z >>> 15)) >>> 0) / 4294967296;
    };
    const options = q.options.slice();
    let correct = q.correct;
    // Fisher–Yates：洗選項的同時跟著搬正解索引
    for (let i = options.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rand() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
      if (correct === i) correct = j; else if (correct === j) correct = i;
    }
    return Object.assign({}, q, { options, correct });
  }

  function buildPracticeQuestions(f) {
    const { exp, mod } = f;
    // 有逐題撰寫的題目就優先使用（渲染前洗牌）；其餘實驗由樣板生成。
    const authored = window.PhysicsLabQuestionBank && window.PhysicsLabQuestionBank[exp.id];
    if (Array.isArray(authored) && authored.length) {
      return authored.map((q, i) => shuffleAuthoredQuestion(q, exp.id + "#" + i));
    }

    const points = Array.isArray(exp.points) && exp.points.length ? exp.points : [exp.concept || exp.title];
    const core = compactText(points[0], exp.title, 72);
    const support = compactText(points[1] || exp.concept, exp.title, 72);
    const bridge = TEXTBOOK_BRIDGES[mod.id] || {};
    const conceptChoices = makeChoices(core, neighbourDistractors(f, 3, 0), f.order);
    /*
     * 第二題改問「結論歸屬」：四句都是真的物理敘述，只有一句是這個實驗支持的。
     * 正解取本實驗的第二個學習重點，誘答取別的實驗的重點（取樣偏移與第一題錯開，
     * 不會出現同一句話在兩題裡重複登場）。
     */
    const claimChoices = makeChoices(
      support,
      neighbourDistractors(f, 3, 2),
      f.order + 1
    );
    /*
     * 第三題改問「觀察方法」：正解是本模組的觀察建議，誘答是其他模組的——
     * 它們也都是正確的方法，只是用在這裡會文不對題。
     */
    const otherBridges = Object.keys(TEXTBOOK_BRIDGES).filter(id => id !== mod.id);
    const methodDistractors = [];
    for (let i = 0; i < otherBridges.length && methodDistractors.length < 3; i += 1) {
      const text = TEXTBOOK_BRIDGES[otherBridges[(f.order + i) % otherBridges.length]].observe;
      if (!methodDistractors.includes(text)) methodDistractors.push(text);
    }
    const methodChoices = makeChoices(
      bridge.observe || "ほかの条件は変えずに 1 つの量だけを変え、測定値とグラフの変化を見比べます。",
      methodDistractors,
      f.order + 2
    );
    return [
      {
        type: "選択問題 · 考え方",
        prompt: "「" + exp.title + "」の考え方を最もよく説明しているのはどれですか？",
        options: conceptChoices.options,
        correct: conceptChoices.correct,
        hint: "シミュレーションでは一度に 1 本のスライダーだけを動かします。まず測定値を見て、次にグラフの傾き、面積、ピークが一緒に変わるかを見ます。",
        answer: "パラメータの変化をこの考え方に結びつけます：" + core + "。結果が違って見えるときは、たいてい固定し忘れた条件がもう 1 つあります。"
      },
      {
        type: "選択問題 · どの実験の結論か",
        prompt: "4 人がそれぞれ「シミュレーションを見てわかったこと」を 1 文で書きました。「" + exp.title + "」の結果から言えるのは 1 つだけです。どれですか？",
        options: claimChoices.options,
        correct: claimChoices.correct,
        hint: "それぞれの文の「何が原因で、何が起きるか」に印をつけてから、シミュレーションで実際に測った関係と比べます。",
        answer: "この実験から言えるのは「" + support + "」です。ほかの文も物理としては正しいのですが、別の実験の結論なので、ここには当てはまりません。"
      },
      {
        type: "選択問題 · 観察の進め方",
        prompt: "「" + exp.title + "」のシミュレーションで関係をはっきり見るには、どの手順が最も適していますか？",
        options: methodChoices.options,
        correct: methodChoices.correct,
        hint: "よい観察では、まず条件をそろえ、一度に 1 つの量だけを変えて、測定値やグラフの変化を記録して比べます。",
        answer: "この単元のおすすめの手順：" + (bridge.observe || "ほかの条件は変えずに 1 つの量だけを変え、測定値とグラフの変化を見比べます。") + " ほかの選択肢はほかのテーマ（光や電気回路など）では正しい方法ですが、この実験に使うとちがうものを測ってしまいます。"
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
    status.textContent = solved ? "正解" : "未回答";

    const prompt = el("p", "practice-question", item);
    prompt.textContent = q.prompt;

    const row = el("div", "numeric-row", item);
    const input = el("input", "numeric-input", row);
    input.type = "text";
    input.inputMode = "decimal";
    input.autocomplete = "off";
    input.placeholder = "計算した値を入力";
    input.setAttribute("aria-label", "解答欄");
    if (q.unit) { const unit = el("span", "numeric-unit", row); unit.textContent = q.unit; }
    const submit = el("button", "numeric-submit", row);
    submit.type = "button"; submit.textContent = "答え合わせ";

    const feedback = el("p", "practice-feedback" + (solved ? " is-correct" : ""), item);
    feedback.hidden = !solved;
    if (solved) feedback.textContent = "正解です。答えは " + PL.fmt(q.answer, 3) + (q.unit ? " " + q.unit : "");

    const actions = el("div", "practice-actions", item);
    const hintBtn = el("button", "practice-btn", actions);
    hintBtn.type = "button"; hintBtn.textContent = "ヒントを見る"; hintBtn.setAttribute("aria-expanded", "false");
    const stepBtn = el("button", "practice-btn", actions);
    stepBtn.type = "button"; stepBtn.textContent = "解き方を順に見る"; stepBtn.setAttribute("aria-expanded", "false");
    const newBtn = el("button", "practice-btn", actions);
    newBtn.type = "button"; newBtn.textContent = "別の問題";

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
        feedback.textContent = "先に数値を入力してください。";
        return;
      }
      // 用相對容差，避免學生因為四捨五入位數不同被判錯
      const tol = q.tolerance || 0.03;
      const ok = Math.abs(value - q.answer) <= Math.abs(q.answer) * tol + 1e-9;
      feedback.classList.toggle("is-correct", ok);
      if (ok) {
        feedback.textContent = "正解です。答えは " + PL.fmt(q.answer, 3) + (q.unit ? " " + q.unit : "") +
          "（許容誤差 ±" + (tol * 100).toFixed(0) + "%）";
        status.textContent = "正解";
        setPracticeDone(id, true);
        steps.hidden = false;
        stepBtn.setAttribute("aria-expanded", "true");
      } else {
        const off = ((value - q.answer) / q.answer) * 100;
        feedback.textContent = "まだ違います。正しい値より" + (off > 0 ? "大きく" : "小さく") +
          " " + Math.abs(off).toFixed(0) + "% ずれています。単位の換算と式の変形の向きを確かめてください。";
        status.textContent = "もう一度";
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
      const status = el("span", "practice-status", head); status.textContent = solved ? "正解" : "未回答";
      const prompt = el("p", "practice-question", item);
      prompt.textContent = q.prompt;
      if (q.formula) {
        // 公式是題幹的輔助行，不能蓋掉題目本身問什麼
        const formula = el("span", "practice-formula", prompt); formula.innerHTML = q.formula;
      }
      const choices = el("div", "practice-options", item);
      choices.setAttribute("role", "radiogroup");
      choices.setAttribute("aria-label", "第 " + (index + 1) + " 問の選択肢");
      const optionButtons = [];
      q.options.forEach((choice, choiceIndex) => {
        const option = el("button", "practice-option", choices); option.type = "button";
        option.setAttribute("role", "radio");
        option.setAttribute("aria-checked", String(selectedAnswer === choiceIndex));
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
      if (solved) feedback.textContent = "正解です。この判断は次の問題にも使えます。";
      const actions = el("div", "practice-actions", item);
      const hintBtn = el("button", "practice-btn", actions); hintBtn.type = "button"; hintBtn.textContent = "ヒントを見る"; hintBtn.setAttribute("aria-expanded", "false");
      const answerBtn = el("button", "practice-btn", actions); answerBtn.type = "button"; answerBtn.textContent = "解説を見る"; answerBtn.setAttribute("aria-expanded", "false");
      const hint = el("div", "practice-detail", item); hint.hidden = true;
      const hintLabel = el("strong", null, hint); hintLabel.textContent = "ヒント：";
      hint.append(document.createTextNode(q.hint));
      const answer = el("div", "practice-detail", item); answer.hidden = true;
      const answerLabel = el("strong", null, answer); answerLabel.textContent = "解説：";
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
          feedback.textContent = "もう一度考えてみよう：" + q.hint;
          return;
        }
        optionButtons.forEach(button => { button.disabled = true; });
        option.classList.add("is-correct");
        feedback.classList.remove("is-incorrect");
        feedback.classList.add("is-correct");
        feedback.textContent = "正解です。この判断は次の問題にも使えます。";
        status.textContent = "正解";
        answer.hidden = false;
        answerBtn.setAttribute("aria-expanded", "true");
        setPracticeAnswer(id, choiceIndex);
        setPracticeDone(id, true);
      }));
    });
    // 有隨機計算題的實驗，把它接在選擇題後面當作最後一題
    renderNumericQuestion(root, f, questions.length);
    typeset(root);
    updateFinish();
  }

  /* ------------------------------- 實驗進度：觀察點 → 完成實驗 -------------------------------
   * 實驗中由 sim-observe.js 在兩個階段彈出觀察題（播放時、改變參數後），
   * 這裡把進度畫在教材欄的「實驗進度」清單，全部觀察完再引導到最下方的總結題。
   */
  const OBS = { id: null, stages: [], done: {}, nudged: false };
  const OBS_TEXT = {
    play: ["再生して観察", "再生すると実験が動き出します。区切りのところで止まって、何が見えたかを聞きます"],
    param: ["パラメータを 1 つ変える", "一時停止中にスライダーを少し動かして手をはなすと、どの測定値が変わったかを聞きます"]
  };
  function finishStats() {
    const root = $("#practice-list");
    const items = root ? Array.from(root.querySelectorAll(".practice-status")) : [];
    return { right: items.filter(n => n.textContent === "正解").length, total: items.length };
  }
  function updateFinish() {
    const st = finishStats();
    const c = $("#finish-count"); if (c) c.textContent = st.right + " / " + st.total;
    const card = $("#finish-card"); if (card) card.classList.toggle("is-complete", st.total > 0 && st.right === st.total);
    renderObserveTrack();
  }
  function renderObserveTrack() {
    const list = $("#observe-steps");
    if (!list) return;
    list.innerHTML = "";
    const steps = OBS.stages.map(k => ({ key: k, title: OBS_TEXT[k][0], desc: OBS_TEXT[k][1], state: OBS.done[k] || "" }));
    const st = finishStats();
    steps.push({ key: "finish", title: "まとめの問題", desc: st.total ? st.right + " / " + st.total + " 問正解" : "読み込み中…",
      state: st.total && st.right === st.total ? "right" : "" });
    steps.forEach((s, i) => {
      const li = el("li", "observe-step" + (s.state ? " is-" + s.state : ""), list);
      const n = el("span", "observe-step-n", li); n.textContent = s.state ? "✓" : String(i + 1);
      const tx = el("div", "observe-step-text", li);
      const b = el("b", null, tx); b.textContent = s.title;
      const d = el("span", null, tx); d.textContent = s.state === "seen" ? "観察ずみ（答えは解説の中）" : s.desc;
      if (s.key === "finish") {
        /*
         * 可點的是蓋在整列上的透明按鈕，而不是把 <li> 改成 role="button"：
         * <ol> 只能直接放 <li>，li 一變成按鈕，螢幕報讀器就讀不出「第 3 項，共 3 項」，
         * 原生 <button> 也省掉自己處理 Enter／空白鍵。
         */
        li.classList.add("is-link");
        const hit = el("button", "observe-step-hit", li); hit.type = "button";
        hit.setAttribute("aria-label", s.title + "：" + d.textContent + "。ページ下の「実験のまとめ」へ移動");
        hit.addEventListener("click", () => { const card = $("#finish-card"); if (card) card.scrollIntoView({ behavior: "smooth", block: "start" }); });
      }
    });
  }
  function nudgeFinish() {
    if (OBS.nudged) return;
    const st = finishStats();
    if (st.total && st.right === st.total) return;
    OBS.nudged = true;
    document.querySelectorAll(".finish-nudge").forEach(n => n.remove());
    const t = el("div", "finish-nudge", document.body);
    t.setAttribute("role", "status");
    const tx = el("div", null, t);
    const b = el("b", null, tx); b.textContent = "観察できました";
    const sp = el("span", null, tx); sp.textContent = "最後に「実験のまとめ」の問題で、ちゃんと理解できたか確かめます。";
    const go = el("button", "finish-nudge-go", t); go.type = "button"; go.textContent = "まとめの問題へ";
    const x = el("button", "finish-nudge-x", t); x.type = "button"; x.setAttribute("aria-label", "閉じる"); x.textContent = "×";
    const close = () => t.remove();
    go.addEventListener("click", () => { close(); const card = $("#finish-card"); if (card) card.scrollIntoView({ behavior: "smooth", block: "start" }); });
    x.addEventListener("click", close);
    setTimeout(close, 12000);
  }
  window.addEventListener("pl-observe-ready", e => {
    const d = e.detail || {};
    if (d.id !== currentId) return;
    OBS.id = d.id; OBS.stages = d.stages || []; OBS.done = d.done || {};
    renderObserveTrack();
  });
  window.addEventListener("pl-observe", e => {
    const d = e.detail || {};
    if (d.id !== currentId) return;
    OBS.done = d.done || OBS.done;
    renderObserveTrack();
    if (OBS.stages.length && OBS.stages.every(k => OBS.done[k])) setTimeout(nudgeFinish, 900);
  });
  document.addEventListener("click", e => {
    if (e.target.closest && e.target.closest("#practice-list")) setTimeout(updateFinish, 0);
  });

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
    showSaveStatus("学習データを書き出しました", "ok");
  }

  function importLearningSave(file) {
    if (!file) return;
    // 8 MB 以上不可能是這個網站的存檔，先擋掉避免瀏覽器卡死。
    if (file.size > 8 * 1024 * 1024) { showSaveStatus("ファイルが大きすぎます。このサイトのデータか確認してください", "warn"); return; }
    const reader = new FileReader();
    reader.onerror = () => showSaveStatus("ファイルを読み込めませんでした", "warn");
    reader.onload = () => {
      let entries;
      try {
        const save = JSON.parse(String(reader.result || ""));
        if (!save || save.app !== "senior-science" || !save.data || typeof save.data !== "object") {
          showSaveStatus("データの形式が正しくありません", "warn");
          return;
        }
        // 先把資料驗完、整理好，再動現有進度。
        // 原本是「先清空全部 pl- 鍵，再寫入」，中途若失敗就等於把使用者的進度洗掉了。
        entries = Object.entries(save.data).filter(([key, value]) => key.startsWith("pl-") && typeof value === "string");
        if (!entries.length) { showSaveStatus("データの中に使える学習記録がありません", "warn"); return; }
      } catch (e) {
        showSaveStatus("データが正しい JSON ではありません", "warn");
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
        showSaveStatus("書き込みに失敗したので、元の進み具合に戻しました", "warn");
        return;
      }

      viewed = new Set(store.get("pl-progress", []));
      applyTheme(preferredTheme());
      // 側邊目錄的完成標記與展開狀態也要一起重畫，否則畫面與存檔不一致。
      refreshViewedMarks();
      renderStudyCenter();
      syncPlanControls(store.get(STUDY_PLAN_KEY, null));
      route();
      showSaveStatus("" + entries.length + " 件の学習記録を読み込みました", "ok");
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
    showSaveStatus("" + days + " 日間の学習計画を作りました", "ok");
  }

  function goNextUnseen() {
    const target = FLAT.find(f => !viewed.has(f.exp.id)) || FLAT[0];
    if (target) location.hash = "#" + target.exp.id;
  }

  function clearStudyPlan() {
    localStorage.removeItem(STUDY_PLAN_KEY);
    renderStudyCenter();
    showSaveStatus("学習計画を消しました", "warn");
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
      if (viewed.has(id)) { const check = el("span", "today-task-check", task); check.textContent = "完了"; }
      task.addEventListener("click", () => location.hash = "#" + id);
    });
    if (today.ids.length > visible.length) {
      const more = el("div", "today-task more", list);
      const name = el("span", "today-task-name", more); name.textContent = "このほかに " + (today.ids.length - visible.length) + " 個の実験があります。上の予定が終わったら、サイドバーの一覧から続けてください。";
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

    let wrong = 0;
    const doneSet = getPracticeDone();
    mod.experiments.forEach(exp => {
      Object.keys(answers).forEach(key => {
        if (key.indexOf(exp.id + "-q") !== 0) return;
        // 正解索引隨日期洗牌，不能拿保存的選項序號與原始題庫比對；
        // 以「有作答紀錄但沒有答對標記」判定錯誤，與排列方式無關。
        if (!doneSet.has(key)) wrong += 1;
      });
    });

    let score = (1 - done / total) * 40;                       // 未讀比例：最多 40 分
    let reason = "まだ全部見ていない";
    if (checkpoint && checkpoint.skipped) { score += 45; reason = "単元チェックをスキップ"; }
    else if (checkpoint && checkpoint.score != null && checkpoint.total) {
      const rate = checkpoint.score / checkpoint.total;
      if (rate < 1) { score += (1 - rate) * 60; reason = "チェック " + checkpoint.score + "/" + checkpoint.total; }
    }
    if (wrong > 0) { score += Math.min(30, wrong * 12); reason = "練習でまちがえた問題：" + wrong + " 問"; }
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
      name.textContent = "いま優先して復習する単元はありません。次の単元に進んでください。";
      return;
    }
    modules.forEach(item => {
      const row = el("button", "review-focus-item", root);
      row.type = "button";
      row.style.setProperty("--m-color", item.mod.color);
      const name = el("span", "review-focus-name", row);
      name.textContent = "単元 " + item.mod.no + " · " + item.mod.title + "（" + item.reason + "）";
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
      title.textContent = "まだ計画がありません";
      summary.textContent = "日数を選ぶと、まだやっていない実験を毎日の予定に均等に割り振ります。";
      renderTodayTasks(null, -1);
      return;
    }
    if (currentIndex >= plan.schedule.length) {
      title.textContent = "計画が終わりました";
      summary.textContent = "この " + plan.days + " 日間の計画には " + plan.totalTasks + " 個の実験があり、いま " + allDone + " 個が終わっています。次の復習の計画を作り直せます。";
      renderTodayTasks(null, -1);
      return;
    }
    title.textContent = "第 " + (currentIndex + 1) + " 日 · " + plan.minutes + " 分";
    summary.textContent = "今日の予定は " + todayTotal + " 個の実験。計画全体では " + allDone + " / " + allPlanned.length + " 個が終わっています。";
    renderTodayTasks(plan, currentIndex);
  }

  /*
   * booted：初始化時的第一次 route() 跑完才設為 true。
   * 剛載入網址就直接開實驗時，頁面本來就在頁首、也不需要淡入；
   * 之後任何換頁（包括從首頁捲到一半點模組卡）都要回頁首與淡入。
   */
  let booted = false;
  function openExp(id) {
    const f = byId[id];
    if (!f) { location.hash = ""; return; }
    if (currentSim && currentSim.stop) { try { currentSim.stop(); } catch (e) {} }
    currentSim = null; currentId = id;
    const { exp, mod } = f;
    Object.assign(OBS, { id, stages: [], done: {}, nudged: false });
    document.querySelectorAll(".finish-nudge").forEach(n => n.remove());
    const plist = $("#practice-list"); if (plist) plist.innerHTML = "";
    updateFinish();

    showView("exp");
    const view = $("#exp-view");
    view.style.setProperty("--m-color", mod.color);
    document.documentElement.style.setProperty("--m-color", mod.color); // 讓 canvas 也能取用模組色

    /*
     * 換實驗時淡入。剛載入網址直接開實驗時不淡入：動畫從透明開始，
     * 標題與說明要等淡入跑完才算「畫出來」，最大內容繪製（LCP）平白慢了 0.3–0.4 秒。
     */
    const firstOpen = !booted;
    if (!firstOpen) { view.classList.remove("fade-in"); void view.offsetWidth; view.classList.add("fade-in"); }

    // 頁首
    $("#exp-crumb").innerHTML = '<b>単元' + mod.no + " · " + mod.title + '</b><span class="sep">/</span>' +
      "第 " + (f.indexInMod + 1) + " 実験";
    $("#exp-title").textContent = exp.title;
    $("#exp-lead").textContent = exp.concept;
    // 學測／分科／課本實驗對應：標題上方一枚標籤，教材區多一段「考題怎麼問」
    const examTag = exp.exam && exp.exam.tag;
    if (examTag) {
      const b = el("span", "exp-exam-tag", $("#exp-crumb"));
      b.textContent = examTag;
    }
    const examBox = $("#guide-exam");
    if (examBox) {
      examBox.hidden = !(exp.exam && exp.exam.how);
      $("#guide-exam-how").textContent = exp.exam && exp.exam.how ? exp.exam.how : "";
    }
    paintLevelBadge(id);
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
    loading.textContent = "シミュレーションを読み込んでいます…";

    ensureExperiment(exp.id).then(ready => {
      if (token !== openToken) return;          // 使用者已經換到別的實驗
      simRoot.innerHTML = "";
      if (!ready) {
        const empty = el("div", "empty", simRoot);
        empty.textContent = "この実験のシミュレーションはまだ作っているところです。";
        return;
      }
      try {
        currentSim = PL.get(exp.id).build(simRoot) || {};
        arrangeStage();
        setTimeout(arrangeStage, 0);   // 掛載鉤子（示範重點、課堂提問）有時晚一拍才插進來
      } catch (err) {
        console.error("シミュレーションの読み込みに失敗：" + exp.id, err);
        simRoot.innerHTML = "";
        const failed = el("div", "empty", simRoot);
        failed.textContent = "シミュレーションの読み込みで問題が起きました。ページを再読み込みしてもう一度試してください。";
      }
      prefetchNeighbours(f.order);
    });

    // 教材：公式與重點
    $("#guide-concept").textContent = exp.concept;
    $("#guide-formula").innerHTML = exp.formula;
    const ul = $("#guide-points"); ul.innerHTML = "";
    exp.points.forEach(p => { const li = el("li", null, ul); li.textContent = p; });
    // 題目練習要等題庫就緒；換頁競爭用與模擬同一個 token 擋掉
    ensureQuestionBank().then(() => {
      if (token !== openToken) return;
      renderPractice(f);
    });
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
      const oldKeys = outputs.querySelector(".sim-shortcuts");
      if (oldKeys) oldKeys.remove();
      const row = el("div", "worksheet-link-row", outputs);
      const link = el("a", "worksheet-link", row);
      link.href = "p/worksheet-" + encodeURIComponent(exp.id) + ".html";
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = "この実験のワークシートを印刷";
      const note = el("span", "worksheet-link-note", row);
      note.textContent = "記録表、グラフ用の方眼、グラフから値を求める欄があり、そのまま配れます";

      /* 鍵盤捷徑：自學與上台都用得到，寫在實驗頁而不是藏進說明書 */
      const keys = el("p", "sim-shortcuts", outputs);
      keys.textContent = "キーボード：スペース 再生／一時停止 · S コマ送り · R すべてリセット · ← → 実験を切り替え · / 検索";
    }

    // 上一個 / 下一個
    const prev = FLAT[f.order - 1], next = FLAT[f.order + 1];
    setNav($("#nav-prev"), prev, "前の実験");
    setNav($("#nav-next"), next, "次の実験");

    // 進度與側邊高亮
    markVisited(id);
    highlightSidebar(id, mod.id);
    updateStageBar(id);
    // 回到頁首。剛載入網址時本來就在頁首；設 scrollTop 會強制整頁同步排版，省下這一次
    if (!firstOpen) { $(".main").scrollTop = 0; window.scrollTo(0, 0); }
    document.title = exp.title + "｜物理実験室";
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
      /*
       * 側欄捲到目前的實驗。以前直接 scrollIntoView：開實驗的同一個工作裡整頁新內容還沒排版，
       * 它會強制同步排版一次（CPU 節流 4 倍時約 160 ms，是開實驗最貴的一步），
       * 側欄收起時還可能把主頁面捲走。改成畫面先畫出來再捲，而且只捲側欄自己。
       */
      const side = $("#sidebar");
      requestAnimationFrame(() => setTimeout(() => {
        if (!item.isConnected || !side || getComputedStyle(side).display === "none") return;
        const box = side.getBoundingClientRect(), r = item.getBoundingClientRect();
        if (r.top < box.top + 60) side.scrollTop -= box.top + 60 - r.top;
        else if (r.bottom > box.bottom - 8) side.scrollTop += r.bottom - box.bottom + 8;
      }, 0));
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
    refreshHomeProgress();
    renderStudyCenter();
  }
  /* 首頁：模組卡的個人進度＋英雄區的「繼續上次」。第一次來的人看不到後者，不會多一顆用不到的按鈕。 */
  function refreshHomeProgress() {
    document.querySelectorAll(".mcard[data-mod]").forEach(card => {
      const mod = C.modules.find(m => m.id === card.dataset.mod);
      if (!mod) return;
      const done = mod.experiments.filter(exp => viewed.has(exp.id)).length;
      const total = mod.experiments.length;
      const bar = card.querySelector(".mcard-progress i");
      if (bar) bar.style.width = (total ? done / total * 100 : 0) + "%";
      const label = card.querySelector(".mcard-done");
      if (label) label.textContent = done + " / " + total;
      card.classList.toggle("is-started", done > 0);
      card.classList.toggle("is-complete", total > 0 && done === total);
    });
    const resume = $("#hero-resume");
    if (resume) {
      const last = store.get("pl-last-viewed", "");
      const target = last && byId[last];
      resume.hidden = !target;
      if (target) {
        resume.href = "#" + target.exp.id;
        const title = $("#hero-resume-title"); if (title) title.textContent = target.exp.title;
        resume.setAttribute("aria-label", "前回の実験の続き：" + target.exp.title);
      }
    }
  }
  function resetProgress() {
    // 清除後無法復原（除非先匯出存檔），所以先確認一次
    if (typeof window.confirm === "function" && !window.confirm("学習の進み具合をすべて消しますか？先に「データを書き出す」でバックアップしておくと安心です。")) return;
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
      empty.textContent = "「" + q + "」に合う実験は見つかりませんでした。";
    }
    hits.forEach(f => {
      const item = el("div", "sr-item", list);
      item.style.setProperty("--m-color", f.mod.color);
      const mod = el("div", "sr-mod", item); mod.textContent = "単元" + f.mod.no + " · " + f.mod.title;
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
    document.documentElement.removeAttribute("data-boot");
    $("#home-view").style.display = name === "home" ? "" : "none";
    $("#exp-view").style.display = name === "exp" ? "" : "none";
    $("#search-results").style.display = name === "search" ? "" : "none";
    syncStageMode(name);
  }

  /*
   * 教師演示的「純實驗台」：只在實驗頁、且是從「教師演示版」進來時生效。
   * 旗標放 sessionStorage——同一個分頁重新整理還在（上台時不會被打回原形），
   * 但新開分頁或回首頁就會清掉，不會讓別人點進來看到一個沒有導覽的頁面。
   */
  const STAGE_KEY = "pl-teacher-stage";
  function stageFlag() { try { return sessionStorage.getItem(STAGE_KEY) === "1"; } catch (e) { return false; } }
  function setStageFlag(on) {
    try { if (on) sessionStorage.setItem(STAGE_KEY, "1"); else sessionStorage.removeItem(STAGE_KEY); } catch (e) {}
  }
  function syncStageMode(view) {
    const showing = view || ($("#exp-view").style.display !== "none" ? "exp" : "home");
    const on = showing === "exp" && stageFlag();
    const was = document.body.classList.contains("stage-only");
    document.body.classList.toggle("stage-only", on);
    if (!on) { closeStageMenu(); toggleStageChart(false); }
    else arrangeStage();
    // 畫布高度依「是否一頁式」計算；切換時讓 sim-core 重新量一次
    if (on !== was) requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
  }
  function exitStageMode() {
    setStageFlag(false);
    closeStageMenu();
    syncStageMode("home");
    location.hash = "";
  }

  /*
   * 一頁式實驗台：整頁與右欄都不捲動。讀數橫排在畫布下方；右欄依序嘗試
   * 全部攤開 → 縮小圖表 → 兩個分頁 → 三個分頁（各再試緊湊排版），取第一個放得下的。
   */
  const STAGE_PANES = [
    { key: "params", label: "パラメータ", nodes: root => [
      ...Array.from(root.querySelectorAll(".sim-insight-block")).filter(n => n.querySelector(".sim-presets")),
      root.querySelector(".sim-control-deck")
    ] },
    { key: "charts", label: "グラフ", nodes: root => [root.querySelector(".sim-charts")] },
    { key: "ask", label: "発問", nodes: root => [root.querySelector(".sim-demo-tip"), root.querySelector(".sim-predict")] }
  ];
  let stageTab = "params";   // 換實驗時沿用上一次的分頁
  let stageFitRaf = 0, stageFitBusy = false, stageFitCount = 0, stageFitWindow = 0, stageFitLater = 0;

  function arrangeStage() {
    if (!document.body.classList.contains("stage-only")) return;
    const root = $("#sim-root");
    if (!root || !root.querySelector(".sim-stage")) return;
    let side = root.querySelector(":scope > .stage-side");
    if (!side) {
      side = el("aside", "stage-side", root); side.setAttribute("aria-label", "実験の操作");
      const tabs = el("div", "stage-tabs", side); tabs.setAttribute("role", "tablist"); tabs.setAttribute("aria-label", "右側のタブ");
      STAGE_PANES.forEach((p, i) => {
        const pane = el("div", "stage-pane", side); pane.dataset.pane = p.key;
        pane.id = "stage-pane-" + p.key; pane.setAttribute("role", "tabpanel");
        const tab = el("button", "stage-tab", tabs); tab.type = "button"; tab.dataset.pane = p.key;
        tab.setAttribute("role", "tab"); tab.setAttribute("aria-controls", pane.id);
        tab.title = p.label + "（" + (i + 1) + "）";
        tab.addEventListener("click", () => selectStageTab(p.key, true));
      });
      const dock = el("div", "stage-dock", root); dock.setAttribute("aria-label", "測定値");
      // 內容長高（例如課堂提問揭曉答案）就重排
      if (typeof ResizeObserver !== "undefined") {
        const ro = new ResizeObserver(() => {
          if (stageFitBusy) return;
          const s = root.querySelector(":scope > .stage-side");
          const v = root.querySelector(".sim-visual-panel");
          if ((s && s.scrollHeight > s.clientHeight + 1) || (v && v.scrollHeight > v.clientHeight + 1)) scheduleStageFit(true);
        });
        side.querySelectorAll(".stage-pane").forEach(p => ro.observe(p));
        ro.observe(dock);
        side._stageRo = ro;
      }
    }
    const transport = root.querySelector(".sim-transport");
    if (transport && transport.parentNode !== side) {
      side.insertBefore(transport, side.firstChild);
      // 播放鍵「播放／暫停」換字、提示換行都會改變傳輸列高度，也要觸發重排
      if (side._stageRo) side._stageRo.observe(transport);
    }
    // 換實驗時 #sim-root 被清空重建，放大圖表的旗標要跟著歸零
    if (root.classList.contains("stage-chart-big") && !root.querySelector(".stage-chart-overlay")) root.classList.remove("stage-chart-big");
    const big = root.classList.contains("stage-chart-big");
    STAGE_PANES.forEach(p => {
      if (big && p.key === "charts") return;
      const pane = side.querySelector('.stage-pane[data-pane="' + p.key + '"]');
      p.nodes(root).forEach(node => { if (node && node.parentNode !== pane) pane.appendChild(node); });
    });
    updateStageChartBtn();
    const dock = root.querySelector(":scope > .stage-dock");
    const readouts = root.querySelector(".sim-readout-panel");
    if (dock && readouts && readouts.parentNode !== dock) dock.appendChild(readouts);
    scheduleStageFit();
  }

  function scheduleStageFit(fromObserver) {
    if (fromObserver) {
      const now = Date.now();
      if (now - stageFitWindow > 1000) { stageFitWindow = now; stageFitCount = 0; }
      if (++stageFitCount > 10) {
        // 太頻繁就等一秒再補排一次，不要就此放著溢出
        if (!stageFitLater) stageFitLater = setTimeout(() => { stageFitLater = 0; scheduleStageFit(true); }, 1000);
        return;
      }
    }
    cancelAnimationFrame(stageFitRaf);
    stageFitRaf = requestAnimationFrame(fitStage);
  }

  function selectStageTab(key, user) {
    const side = document.querySelector("#sim-root > .stage-side");
    if (!side) return;
    const groups = side._stageGroups || [];
    if (!groups.length) return;
    const group = groups.find(g => g.includes(key)) || groups[0];
    const tabs = Array.from(side.querySelectorAll(".stage-tab")).filter(t => !t.hidden);
    const target = tabs.find(t => t.dataset.pane === group[0]);
    if (user) stageTab = key;
    tabs.forEach(t => {
      const on = t === target;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
    });
    side.querySelectorAll(".stage-pane").forEach(p => { p.hidden = !p._stageHasContent || !group.includes(p.dataset.pane); });
    // 隱藏時量不到寬度、不會重算；顯示出來後依當下的上限補算一次
    if (group.includes("charts")) side.querySelectorAll(".stage-pane[data-pane='charts'] .sim-chart > canvas.sim-canvas").forEach(refitCanvas);
  }

  /*
   * 圖表放大到主畫面（G）
   * 右欄的圖表只有三百多像素寬，投影到教室後排看不清楚刻度。按一下把整組圖表搬到畫布的位置、
   * 撐滿實驗台；右欄的滑桿照樣能拉，曲線即時更新。再按一次（或 Esc）搬回右欄。
   * 搬的是同一個 DOM 節點，圖表的繪圖程式不需要知道自己被搬過。
   */
  function updateStageChartBtn() {
    const btn = $("#stage-chart"), root = $("#sim-root");
    if (!btn || !root) return;
    const has = !!root.querySelector(".sim-charts .sim-chart");
    const on = root.classList.contains("stage-chart-big");
    btn.hidden = !has;
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    const label = btn.querySelector("span");
    if (label) label.textContent = on ? "実験に戻る" : "グラフを拡大";
  }
  function toggleStageChart(force) {
    const root = $("#sim-root");
    if (!root) return;
    const stage = root.querySelector(":scope > .sim-stage");
    const charts = root.querySelector(".sim-charts");
    const was = root.classList.contains("stage-chart-big");
    /*
     * 只有教師版才需要量欄數。getComputedStyle(...).gridTemplateColumns 會強制整頁排版，
     * 以前每次換頁（showView → 關掉放大圖）都量一次，開實驗時白白多一次同步排版。
     */
    const want = !!(force == null ? !was : force) && !!stage && !!charts && document.body.classList.contains("stage-only");
    const on = want && getComputedStyle(root).gridTemplateColumns.split(" ").length >= 2;
    let ov = stage && stage.querySelector(":scope > .stage-chart-overlay");
    if (on) {
      if (!ov) {
        ov = el("div", "stage-chart-overlay", stage);
        ov.setAttribute("role", "region"); ov.setAttribute("aria-label", "拡大した結果のグラフ");
        const back = el("button", "stage-chart-back", ov); back.type = "button"; back.textContent = "実験の画面に戻る（G）";
        back.addEventListener("click", () => toggleStageChart(false));
      }
      ov.appendChild(charts);
      root.classList.add("stage-chart-big");
      scheduleStageFit();     // 右欄少了圖表分頁，重新分組；fitStage 最後會量放大後的圖表
    } else if (was || ov) {
      root.classList.remove("stage-chart-big");
      if (charts) {
        charts.querySelectorAll(".sim-chart").forEach(w => { w._stageMaxH = 0; w._stageMinH = 0; });
        const pane = root.querySelector('.stage-pane[data-pane="charts"]');
        if (pane && charts.parentNode !== pane) pane.appendChild(charts);
      }
      if (ov) ov.remove();
      scheduleStageFit();
    }
    updateStageChartBtn();
  }
  function fitBigCharts() {
    const root = $("#sim-root");
    const charts = root && root.classList.contains("stage-chart-big") && root.querySelector(".stage-chart-overlay > .sim-charts");
    if (!charts) return;
    const wraps = Array.from(charts.querySelectorAll(":scope > .sim-chart"));
    if (!wraps.length) return;
    const cols = Math.max(1, getComputedStyle(charts).gridTemplateColumns.split(" ").length);
    const rows = Math.ceil(wraps.length / cols);
    const gap = parseFloat(getComputedStyle(charts).rowGap) || 10;
    const per = (charts.clientHeight - gap * (rows - 1)) / rows;
    wraps.forEach(w => {
      const c = w.querySelector(":scope > canvas.sim-canvas");
      if (!c) return;
      const chrome = w.getBoundingClientRect().height - c.getBoundingClientRect().height;
      const cap = Math.max(140, Math.floor(per - chrome - 2));
      if (Math.abs((w._stageMaxH || 0) - cap) > 1) { w._stageMaxH = cap; w._stageMinH = 140; refitCanvas(c); }
    });
  }

  function refitCanvas(canvas) {
    const cv = canvas && canvas._labCv;
    if (!cv || typeof cv.refit !== "function" || !canvas.parentNode.getBoundingClientRect().width) return;
    try { cv.refit(); } catch (e) {}
  }

  function fitStage() {
    if (!document.body.classList.contains("stage-only")) return;
    const root = $("#sim-root");
    const side = root && root.querySelector(":scope > .stage-side");
    if (!side) return;
    // 直式／窄螢幕上下排列、可捲動
    const stacked = getComputedStyle(root).gridTemplateColumns.split(" ").length < 2;
    stageFitBusy = true;
    try {
      const dock = root.querySelector(":scope > .stage-dock");
      if (dock) {
        const r = dock.querySelector(".sim-readout-panel");
        dock.hidden = !r || r.hidden || getComputedStyle(r).display === "none" || !r.querySelector(".readout");
      }
      const panes = Array.from(side.querySelectorAll(".stage-pane"));
      panes.forEach(p => {
        p._stageHasContent = Array.from(p.children).some(n => getComputedStyle(n).display !== "none");
      });
      const present = panes.filter(p => p._stageHasContent).map(p => p.dataset.pane);
      const chartWraps = Array.from(side.querySelectorAll(".stage-pane[data-pane='charts'] .sim-chart"));
      const chartCanvas = w => w.querySelector(":scope > canvas.sim-canvas");
      const setChartCap = (cap, min) => chartWraps.forEach(w => {
        const c = chartCanvas(w); if (!c) return;
        w._stageMaxH = cap; w._stageMinH = min;
        refitCanvas(c);
      });

      if (stacked) {
        // 直式／窄螢幕上下排列時沒有「主畫面」可放大，收回右欄
        if (root.classList.contains("stage-chart-big")) toggleStageChart(false);
        side.classList.remove("is-compact", "is-dense", "is-wide", "is-tight", "is-overflowing", "has-tabs");
        root.classList.remove("stage-wide");
        side._stageGroups = [present];
        side.querySelector(".stage-tabs").hidden = true;
        panes.forEach(p => { p.hidden = !p._stageHasContent; });
        setChartCap(0, 0);
        return;
      }

      // 主畫布：扣掉讀數列與畫布卡其他內容後的高度
      const fitMain = () => {
        const stage = root.querySelector(":scope > .sim-stage");
        const visual = stage && stage.querySelector(".sim-visual-panel");
        const main = visual && visual.querySelector(".sim-canvas-wrap > canvas.sim-canvas");
        if (!main) return;
        const wrap = main.parentNode;
        let chrome = 0;
        Array.from(visual.children).forEach(n => {
          if (getComputedStyle(n).display === "none" || getComputedStyle(n).position === "absolute") return;
          if (n === wrap) {
            const cs = getComputedStyle(n);
            chrome += (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
            Array.from(n.children).forEach(k => {
              if (k === main) return;
              const ks = getComputedStyle(k);
              if (ks.display === "none" || ks.position === "absolute" || ks.position === "fixed") return;
              chrome += k.getBoundingClientRect().height;
            });
          } else {
            const ns = getComputedStyle(n);
            chrome += n.getBoundingClientRect().height + (parseFloat(ns.marginTop) || 0) + (parseFloat(ns.marginBottom) || 0);
          }
        });
        const vs = getComputedStyle(visual);
        chrome += (parseFloat(vs.borderTopWidth) || 0) + (parseFloat(vs.borderBottomWidth) || 0) + (parseFloat(vs.paddingTop) || 0) + (parseFloat(vs.paddingBottom) || 0);
        const cap = Math.floor(stage.clientHeight - chrome - 2);
        if (cap > 0 && Math.abs((wrap._stageMaxH || 0) - cap) > 1) { wrap._stageMaxH = cap; wrap._stageMinH = 160; refitCanvas(main); }
      };

      const tabsBar = side.querySelector(".stage-tabs");
      const has = k => present.includes(k);
      const plans = [];
      const all = [present];
      plans.push({ groups: all, shrink: false });
      if (has("charts")) plans.push({ groups: all, shrink: true, min: 130 });
      if (has("charts") && present.length > 1) {
        const rest = present.filter(k => k !== "charts");
        plans.push({ groups: [rest, ["charts"]], shrink: true, min: 110 });
      }
      if (present.length > 2 || (present.length === 2 && !has("charts"))) plans.push({ groups: present.map(k => [k]), shrink: true, min: 100 });

      const overflow = () => side.scrollHeight - side.clientHeight;
      const applyGroups = groups => {
        side._stageGroups = groups;
        const tabbed = groups.length > 1;
        side.classList.toggle("has-tabs", tabbed);
        tabsBar.hidden = !tabbed;
        side.querySelectorAll(".stage-tab").forEach(t => {
          const g = groups.find(x => x[0] === t.dataset.pane);
          t.hidden = !g;
          if (g) {
            const label = g.map(k => STAGE_PANES.find(p => p.key === k).label).join("・");
            const n = g.includes("charts") ? chartWraps.length : 0;
            t.textContent = label + (n > 1 ? " " + n : "");
          }
        });
      };
      const groupFits = (group, plan) => {
        side.querySelectorAll(".stage-pane").forEach(p => { p.hidden = !p._stageHasContent || !group.includes(p.dataset.pane); });
        if (group.includes("charts") && chartWraps.length) {
          setChartCap(0, 0);
          let over = overflow();
          if (over > 1 && plan.shrink) {
            const heights = chartWraps.map(w => { const c = chartCanvas(w); return c ? c.getBoundingClientRect().height : 0; });
            const cap = Math.floor(Math.max(...heights) - over / chartWraps.length) - 2;
            if (cap < plan.min) return false;
            setChartCap(cap, plan.min);
            over = overflow();
          }
          return over <= 1;
        }
        return overflow() <= 1;
      };
      const DENSITY = [[], ["is-compact"], ["is-compact", "is-dense"]];
      const setDensity = (d, wide, tight) => {
        side.classList.remove("is-compact", "is-dense", "is-wide", "is-tight", "is-overflowing");
        root.classList.toggle("stage-wide", !!wide);
        DENSITY[d].forEach(c => side.classList.add(c));
        if (wide) side.classList.add("is-wide");
        if (tight) side.classList.add("is-tight");
      };

      setDensity(0, false);
      fitMain();
      let chosen = null;
      const tryPlan = (plan, d, wide, tight) => {
        setDensity(d, wide, tight);
        applyGroups(plan.groups);
        const caps = [];
        for (const g of plan.groups) {
          if (!groupFits(g, plan)) return false;
          caps.push(g.includes("charts") ? (chartWraps[0] && chartWraps[0]._stageMaxH) || 0 : null);
        }
        chosen = { plan, d, wide, tight, caps };
        return true;
      };
      outer:
      for (const plan of plans) {
        for (let d = 0; d < DENSITY.length; d++) {
          if (d === 2 && plan.groups.length === 1 && plans.length > 1) continue;
          if (tryPlan(plan, d, false)) break outer;
        }
      }
      if (!chosen) {
        const last = plans[plans.length - 1];
        if (!tryPlan(last, 2, true) && !tryPlan(last, 2, true, true)) {
          // 最後一招：讓分頁自己捲
          chosen = { plan: last, d: 2, wide: true, caps: [], scroll: true };
          setDensity(2, true, true); applyGroups(last.groups);
        }
      }
      side.classList.toggle("is-overflowing", !!chosen.scroll);
      const chartsGroupIndex = chosen.plan.groups.findIndex(g => g.includes("charts"));
      if (chartsGroupIndex >= 0) {
        const cap = chosen.caps[chartsGroupIndex];
        const g = chosen.plan.groups[chartsGroupIndex];
        panes.forEach(p => { p.hidden = !p._stageHasContent || !g.includes(p.dataset.pane); });
        setChartCap(cap || 0, chosen.plan.min || 0);
      }
      fitMain();
      selectStageTab(stageTab, false);
      fitBigCharts();
    } finally {
      requestAnimationFrame(() => {
        stageFitBusy = false;
        // 排版期間內容又變了（例如播放中按鈕文字改變）就再排一次
        if (side.isConnected && side.scrollHeight > side.clientHeight + 1) scheduleStageFit(true);
      });
    }
  }

  /* ---------------------------- 教師演示列 ---------------------------- */
  function updateStageBar(id) {
    const f = byId[id];
    if (!f) return;
    const bar = $("#stage-bar");
    if (bar) bar.style.setProperty("--m-color", f.mod.color);
    const mod = $("#stage-picker-mod"); if (mod) mod.textContent = "単元" + f.mod.no;
    const title = $("#stage-picker-title"); if (title) title.textContent = f.exp.title;
    const count = $("#stage-picker-count");
    if (count) count.textContent = (f.mod.experiments.indexOf(f.exp) + 1) + " / " + f.mod.experiments.length;
    const prev = $("#stage-prev"), next = $("#stage-next");
    if (prev) prev.disabled = !FLAT[f.order - 1];
    if (next) next.disabled = !FLAT[f.order + 1];
  }
  function renderStageMenu(query) {
    const list = $("#stage-menu-list");
    if (!list) return;
    list.innerHTML = "";
    const q = (query || "").trim().toLowerCase();
    let count = 0;
    C.modules.forEach(m => {
      const items = m.experiments.filter(exp => !q || exp.title.toLowerCase().includes(q) || m.title.toLowerCase().includes(q));
      if (!items.length) return;
      const group = el("div", "stage-menu-mod", list);
      group.style.setProperty("--m-color", m.color);
      const head = el("p", "stage-menu-mod-title", group);
      head.innerHTML = "<span>" + String(C.modules.indexOf(m) + 1).padStart(2, "0") + "</span>";
      head.appendChild(document.createTextNode(m.title));
      items.forEach(exp => {
        const item = el("button", "stage-menu-item" + (exp.id === currentId ? " current" : ""), group);
        item.type = "button"; item.textContent = exp.title;
        item.addEventListener("click", () => { closeStageMenu(); location.hash = "#" + exp.id; });
        count++;
      });
    });
    if (!count) { const empty = el("p", "stage-menu-empty", list); empty.textContent = "合う実験が見つかりません"; }
  }
  function openStageMenu() {
    const menu = $("#stage-menu"); if (!menu) return;
    const input = $("#stage-menu-input");
    if (input) input.value = "";
    renderStageMenu("");
    menu.hidden = false;
    $("#stage-picker").setAttribute("aria-expanded", "true");
    setTimeout(() => { if (input) input.focus(); }, 0);
  }
  function closeStageMenu() {
    const menu = $("#stage-menu"); if (!menu || menu.hidden) return;
    menu.hidden = true;
    const picker = $("#stage-picker"); if (picker) picker.setAttribute("aria-expanded", "false");
  }
  function toggleStageMenu() { const menu = $("#stage-menu"); if (menu && menu.hidden) openStageMenu(); else closeStageMenu(); }
  function stepStage(delta) {
    const f = currentId && byId[currentId];
    const target = f && FLAT[f.order + delta];
    if (target) location.hash = "#" + target.exp.id;
  }
  function toggleStageFullscreen() {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
    } catch (e) {}
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
    /*
     * 章節檢核的選項也要洗牌。
     * 題目資料為了撰寫方便常把正解放在第一個（生物、地科版 36 題全部是 A），
     * 直接照順序顯示，學生很快就會發現「檢核一律選 A」，三題等於白考。
     * 與練習題共用同一套「裝置 + 日期」種子：同一天重開順序不變，方便檢討；隔天換一種排列。
     */
    const questions = (MODULE_CHECKPOINTS[mod.id] || []).map((q, i) => {
      const mixed = shuffleAuthoredQuestion({ options: q.choices, correct: q.correct }, "checkpoint:" + mod.id + "#" + i);
      return Object.assign({}, q, { choices: mixed.options, correct: mixed.correct });
    });
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
    kicker.textContent = "次へ進む前のまとめ · 単元 " + state.mod.no;
    const title = el("h2", "checkpoint-title", root); title.id = "checkpoint-title";
    title.textContent = state.mod.title + " 単元チェック";

    if (state.completed) {
      renderCheckpointResult(root, state);
      return;
    }

    const intro = el("p", "checkpoint-intro", root);
    intro.textContent = "「" + state.nextMod.title + "」に進む前に、3 問でこの単元のポイントを確認します。";
    const progress = el("div", "checkpoint-progress", root);
    const progressLabel = el("span", null, progress); progressLabel.textContent = "第 " + (state.index + 1) + " / " + state.questions.length + " 問";
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
      feedback.innerHTML = "<strong>" + (correct ? "正解です。" : "もう一度考えてみよう。この問題で見るところは：") + "</strong>" + question.explanation;
    }

    const actions = el("div", "checkpoint-actions", root);
    const skip = el("button", "checkpoint-skip", actions); skip.type = "button"; skip.textContent = "チェックを飛ばして進む";
    skip.addEventListener("click", () => leaveCheckpoint());
    if (selected !== undefined) {
      const next = el("button", "checkpoint-next", actions); next.type = "button";
      next.textContent = state.index === state.questions.length - 1 ? "結果を見る" : "次の問題";
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
      ? "3 問とも正解です。次の単元に進めます。"
      : "今回の結果を記録しました。下の問題は、この単元に戻ってきたときの復習の手がかりになります。";
    const review = el("div", "checkpoint-review", root);
    state.questions.forEach((question, index) => {
      const item = el("div", "checkpoint-review-item", review);
      const correct = state.answers[index] === question.correct;
      item.classList.add(correct ? "correct" : "incorrect");
      item.textContent = (correct ? "できた · " : "要復習 · ") + question.explanation;
    });
    const actions = el("div", "checkpoint-actions", root);
    const next = el("button", "checkpoint-next", actions); next.type = "button";
    next.textContent = "次へ：「" + state.nextMod.title + "」";
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
    if (stageFlag()) return false;   // 老師上台切實驗時不能跳出學生用的章節小考
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
      setStageFlag(false);
      showView("home"); document.title = "物理実験室｜動かして学ぶ中高の物理";
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

  function startApp() {
    if (initialized) return;
    initialized = true;
    init();
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
        status.textContent = "このブラウザ（またはファイルとして直接開いた場合）はオフライン機能に対応していませんが、内容はすべてふつうに使えます。";
        cacheBtn.disabled = true;
        return;
      }
      status.textContent = navigator.onLine
        ? "基本の内容はオフラインで使えます。下のボタンを押すと、" + FLAT.length + " 個の実験と数式の表示をまとめて保存し（約 1.2 MB）、ネットがなくても開けるようになります。"
        : "いまネットにつながっていません。一度見た実験はそのまま開けます。";
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
        status.textContent = "オフライン機能の準備ができていません。ページを再読み込みしてもう一度試してください。";
        return;
      }
      cacheBtn.disabled = true;
      progress.hidden = false;
      progressText.textContent = "ダウンロードを始めます…";
      navigator.serviceWorker.controller.postMessage({ type: "cache-all-experiments" });
    });

    if (supported) {
      navigator.serviceWorker.addEventListener("message", event => {
        const data = event.data || {};
        if (data.type === "cache-progress") {
          const pct = Math.round(data.done / data.total * 100);
          fill.style.width = pct + "%";
          progressText.textContent = "" + data.done + " / " + data.total + " 個のファイルをダウンロードしました";
        }
        if (data.type === "cache-complete") {
          fill.style.width = "100%";
          progressText.textContent = "完了しました。すべての実験をオフラインで使えます。";
          cacheBtn.textContent = "ダウンロード完了";
          // 記住是「哪一版」下載完成：發新版時 SW 會清掉舊快取，旗標也要跟著失效，否則按鈕會永遠停在「已下載完成」
          try { store.set("pl-offline-cached", (window.PhysicsLabSite && window.PhysicsLabSite.build) || true); } catch (e) {}
        }
      });
      const cachedBuild = store.get("pl-offline-cached", false);
      if (cachedBuild && cachedBuild === ((window.PhysicsLabSite && window.PhysicsLabSite.build) || true)) {
        cacheBtn.textContent = "ダウンロード完了";
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
      status.textContent = "ホーム画面に追加しました。アプリのように開けます。";
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
    const sideBtn = $("#sidebar-toggle");
    if (sideBtn) {
      applySidebarCollapsed(store.get("pl-sidebar-collapsed", false));
      sideBtn.addEventListener("click", () => {
        applySidebarCollapsed(!document.querySelector(".app").matches('[data-sidebar="collapsed"]'));
      });
    }
    $("#menu-toggle").addEventListener("click", toggleSidebar);
    $("#scrim").addEventListener("click", closeSidebarMobile);
    $("#brand-home").addEventListener("click", () => location.hash = "");
    const stageExit = $("#stage-exit");
    if (stageExit) stageExit.addEventListener("click", exitStageMode);
    const stagePicker = $("#stage-picker");
    if (stagePicker) stagePicker.addEventListener("click", toggleStageMenu);
    const stagePrev = $("#stage-prev"); if (stagePrev) stagePrev.addEventListener("click", () => stepStage(-1));
    const stageNext = $("#stage-next"); if (stageNext) stageNext.addEventListener("click", () => stepStage(1));
    const stageFull = $("#stage-full"); if (stageFull) stageFull.addEventListener("click", toggleStageFullscreen);
    const stageChart = $("#stage-chart"); if (stageChart) stageChart.addEventListener("click", () => toggleStageChart());
    const stageThemeBtn = $("#stage-theme");
    if (stageThemeBtn) stageThemeBtn.addEventListener("click", () => {
      applyTheme(document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light");
    });
    document.addEventListener("fullscreenchange", () => {
      const label = stageFull && stageFull.querySelector("span");
      if (label) label.textContent = document.fullscreenElement ? "全画面を終わる" : "全画面";
    });
    const stageInput = $("#stage-menu-input");
    if (stageInput) {
      stageInput.addEventListener("input", () => renderStageMenu(stageInput.value));
      stageInput.addEventListener("keydown", e => {
        if (e.key === "Enter") { const first = $("#stage-menu-list .stage-menu-item"); if (first) first.click(); }
      });
    }
    document.addEventListener("pointerdown", e => {
      const menu = $("#stage-menu");
      if (menu && !menu.hidden && !menu.contains(e.target) && !e.target.closest("#stage-picker")) closeStageMenu();
    });
    /*
     * 首頁的兩條入口：教師演示版（精簡）與自學完整版（有鷹架）。
     * 進入的是同一批實驗，差別只在 body.demo-mode——sim-core 會據此收起或顯示鷹架。
     * 先把模式寫進 localStorage 並套到 body，再導向第一個實驗；之後進任何實驗都維持這個模式。
     */
    function enterWithMode(demo) {
      document.body.classList.toggle("demo-mode", demo);
      store.set("pl-demo-mode-flag", demo);   // 給 app 端記錄；sim-core 讀的是原始鍵
      try { localStorage.setItem("pl-demo-mode", demo ? "1" : "0"); } catch (e) {}
      setStageFlag(demo);   // 教師演示版＝純實驗台；自學完整版維持原本完整介面
      const last = store.get("pl-last-viewed", "");
      location.hash = "#" + (demo && last && byId[last] ? last : FLAT[0].exp.id);
      // 老師要先挑今天要演示的實驗：進場直接把選單打開
      if (demo) setTimeout(openStageMenu, 60);
    }
    const teacherBtn = $("#enter-teacher");
    if (teacherBtn) teacherBtn.addEventListener("click", () => enterWithMode(true));
    const studentBtn = $("#enter-student");
    if (studentBtn) studentBtn.addEventListener("click", () => enterWithMode(false));
    $("#hero-browse").addEventListener("click", () => ($(".module-section") || $("#module-grid")).scrollIntoView({ behavior: "smooth", block: "start" }));
    $("#btn-reset").addEventListener("click", resetProgress);
    $("#home-export-save").addEventListener("click", exportLearningSave);
    $("#home-import-save").addEventListener("click", () => $("#import-save-file").click());
    $("#import-save-file").addEventListener("change", event => {
      importLearningSave(event.target.files && event.target.files[0]);
      event.target.value = "";
    });
    $("#plan-days").addEventListener("change", () => syncPlanControls(store.get(STUDY_PLAN_KEY, null)));
    $("#btn-create-plan").addEventListener("click", createStudyPlan);
    $("#btn-clear-plan").addEventListener("click", clearStudyPlan);
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
      if (document.body.classList.contains("stage-only")) {
        const menu = $("#stage-menu");
        if (menu && !menu.hidden) {
          if (e.key === "Escape") { closeStageMenu(); $("#stage-picker").focus(); }
          return;   // 選單開著時，方向鍵與空白鍵留給搜尋框
        }
        if (e.key === "Escape" && $("#sim-root").classList.contains("stage-chart-big")) { toggleStageChart(false); return; }
        if (e.key === "Escape" && !document.fullscreenElement) { exitStageMode(); return; }
        if (e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA" && !e.repeat) {
          if (e.key === "/") { e.preventDefault(); openStageMenu(); return; }
          if (e.key === "f" || e.key === "F") { e.preventDefault(); toggleStageFullscreen(); return; }
          if ((e.key === "g" || e.key === "G") && $("#stage-chart") && !$("#stage-chart").hidden) { e.preventDefault(); toggleStageChart(); return; }
          if (e.key === "1" || e.key === "2" || e.key === "3") {
            const tab = document.querySelector('#sim-root .stage-tab[data-pane="' + STAGE_PANES[+e.key - 1].key + '"]');
            if (tab && !tab.hidden && !tab.parentNode.hidden) { e.preventDefault(); tab.click(); return; }
          }
        }
      }
      if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "TEXTAREA") return;
      /*
       * 焦點在按鈕、連結、選項晶片上時，空白鍵與方向鍵屬於那個元件：
       * 以前空白鍵一律被攔下來切換播放（preventDefault 讓按鈕按不下去），
       * 鍵盤使用者在實驗頁裡沒辦法用空白鍵按任何按鈕；在晶片上按方向鍵還會直接跳到別的實驗。
       * 元件自己已經處理掉的按鍵（例如記錄表的列按空白鍵＝套用），也不再搶。
       */
      const onWidget = e.defaultPrevented || !!(e.target.closest && e.target.closest('button, a[href], summary, tr[tabindex], [role="button"], [role="radio"], [role="tab"], [role="checkbox"], [role="switch"], [role="slider"], [role="link"], [contenteditable="true"]'));
      if (currentId && $("#exp-view").style.display !== "none") {
        const f = byId[currentId];
        if (!onWidget && e.key === "ArrowRight" && FLAT[f.order + 1]) { location.hash = "#" + FLAT[f.order + 1].exp.id; }
        if (!onWidget && e.key === "ArrowLeft" && FLAT[f.order - 1]) { location.hash = "#" + FLAT[f.order - 1].exp.id; }
        // 空白鍵＝播放／暫停（PhET 慣例）：雙手留在鍵盤上就能推進 demo
        if (!onWidget && e.key === " " && !e.repeat) {
          const playBtn = document.querySelector(".sim-transport-play");
          if (playBtn && !playBtn.hidden) { e.preventDefault(); playBtn.click(); }
        }
        // R＝全部重設；S＝單步。自學與上台都少一次滑鼠移動
        if ((e.key === "r" || e.key === "R") && !e.repeat) {
          const resetBtn = document.querySelector(".sim-transport-reset");
          if (resetBtn && !resetBtn.hidden) { e.preventDefault(); resetBtn.click(); }
        }
        if ((e.key === "s" || e.key === "S") && !e.repeat) {
          const stepBtn = document.querySelector(".sim-transport-btn");
          if (stepBtn && !stepBtn.hidden && !stepBtn.disabled) { e.preventDefault(); stepBtn.click(); }
        }
      }
      // 「/」聚焦搜尋：從任何地方一鍵找實驗
      if ((e.key === "/" || (e.key.toLowerCase() === "k" && (e.ctrlKey || e.metaKey))) && !e.repeat) {
        e.preventDefault();
        const search = $("#search-input");
        if (search) { search.focus(); search.select(); }
      }
      if (e.key === "Escape") closeSidebarMobile();
    });

    let stageResizeTimer = 0;
    window.addEventListener("resize", () => {
      if (!document.body.classList.contains("stage-only")) return;
      clearTimeout(stageResizeTimer);
      stageResizeTimer = setTimeout(scheduleStageFit, 120);
    });
    /*
     * 字型載完再排一次教師版版面。document.fonts.ready 一取用就會強制整份文件重算樣式，
     * 放在初始化裡等於讓第一個畫面多等一次（節流時約 50 ms）；延到畫面畫出來之後。
     */
    requestAnimationFrame(() => setTimeout(() => {
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => scheduleStageFit()).catch(() => {});
    }, 0));
    window.addEventListener("hashchange", route);
    route();
    booted = true;

    // 版本連線時間
    const clock = $("#clock");
    if (clock) {
      // 分頁在背景、或手機版（頂列的時鐘藥丸本來就隱藏）時不更新：每秒格式化時間也是一筆開銷
      const narrow = window.matchMedia ? window.matchMedia("(max-width: 600px)") : { matches: false };
      const tick = () => { if (document.hidden || narrow.matches) return; const d = new Date(); clock.textContent = d.toLocaleTimeString("ja-JP", { hour12: false }); };
      tick(); setInterval(tick, 1000);
    }

    // PWA
    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
      window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
      /*
       * 新版接管這個分頁時提示一聲。第一次安裝（原本沒有 controller）不算更新，不提示。
       * 不自動重新整理：學生可能正在填預測、記數據；按「重新整理」或換到還沒載過的實驗時才換新版。
       */
      let hadController = !!navigator.serviceWorker.controller;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!hadController) { hadController = true; return; }
        updatePending = true;
        showUpdateNotice();
      });
    }
    initOfflineCard();
  }

  /* 新版上線提示：右下角一條，不擋操作；手機版貼底、左右留 16px */
  function showUpdateNotice() {
    if (document.querySelector(".update-toast")) return;
    const box = el("div", "update-toast", document.body);
    box.setAttribute("role", "status");
    const msg = el("span", "update-toast-msg", box);
    msg.textContent = "サイトが新しい版に更新されました。再読み込みすると反映されます（別の実験に切り替えたときにも自動で反映されます）。";
    const go = el("button", "update-toast-btn primary", box);
    go.type = "button"; go.textContent = "再読み込み";
    go.addEventListener("click", () => location.reload());
    const later = el("button", "update-toast-btn", box);
    later.type = "button"; later.textContent = "あとで";
    later.addEventListener("click", () => box.remove());
  }

  /*
   * 直接開實驗的網址（#實驗 id）：腳本一執行完就先開始下載引擎外掛與實驗檔，
   * 和初始化首頁、側欄並行。以前要等 init() 跑完、route() 呼叫 openExp() 才開始抓，
   * 慢速網路下實驗台多等將近一秒。loadScript 有去重，之後 openExp 用的是同一批下載。
   */
  (function () {
    const early = decodeURIComponent(location.hash.replace(/^#/, ""));
    if (early && byId[early]) ensureExperiment(early).catch(() => {});
  })();

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startApp);
  else startApp();
})();
