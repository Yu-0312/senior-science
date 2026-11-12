/*
 * sim-observe.js — 觀察點系統
 *
 * 為什麼要有這一層
 * ----------------
 * 有些實驗的關鍵現象是一瞬間或需要特定條件才出現的（過山車在環頂脫軌、
 * 光子累積出條紋、磁鐵經過線圈的瞬間），抽象實驗的學生常常「有看沒有懂」：
 * 畫面在動，但他不知道該看哪裡、也說不出為什麼。
 *
 * 觀察點 = 在模擬播放到關鍵時刻時：
 *   1. 自動暫停（不會因為學生沒注意就錯過）
 *   2. 彈出觀察卡：指出畫面上該看的位置與現象
 *   3. 附一道根據觀察就能回答的小問題
 *   4. 答對（或選「再看我一次」）之後自動繼續播放
 *
 * 資料驅動：每個實驗的觀察點集中在這份表裡，想新增就在這裡加，
 * 不必動各實驗檔。時間用迴圈的模擬時間 t（秒），與速度無關。
 *
 * 觸發規則：
 *   · 每個觀察點只會在「播放中越過 t」時觸發一次（reset 後重新武裝）
 *   · 學生可以按「繼續播放」跳過問題——系統不綁架播放權
 *   · 答錯不懲罰：顯示解說後繼續
 */
(function () {
  "use strict";
  const PL = window.PhysicsLab;
  if (!PL || !PL._hooks) return;

  /* ------------------------------------------------------------------
     觀察點資料表
     t：模擬時間（秒）；若實驗是「按發射才開始」型，t 從觸發後起算
     near：可選，條件式觸發 readout 值（label, op, value）
     ------------------------------------------------------------------ */
  const OBSERVE_POINTS = {
    "loop-track": [
      {
        t: 1.1,
        title: "よく見て：小球はのぼれても、ループのいちばん上を通れるか？",
        hint: "ループのいちばん上を見てください。h = 2.5R のとき、小球はちょうどレールにそって通ります。いちばん上での速さがどれだけ残っているかに注目。",
        quiz: {
          q: "小球がループのいちばん上でレールから離れない条件として、はなす高さ h は少なくとも何 R 必要ですか？",
          choices: ["2R", "2.5R", "3R", "4R"],
          correct: 1,
          explain: "h ≥ 2.5R で通れます。h = 2R のエネルギーでは、いちばん上の高さまでのぼるのがやっと（速さ 0）です。でもいちばん上でレールにそって回るには少なくとも √(gR) の速さがいるので、球は途中でレールから離れます。のぼれることと通れることは別の条件です。"
        }
      }
    ],
    "doppler": [
      {
        t: 4.5,
        title: "波面が詰まってきた",
        hint: "波源が動いていると、前の波は「押し縮められ」、後ろの波は「引きのばされ」ます。円弧の間隔を見ると、前は密で後ろは疎になっています。",
        quiz: {
          q: "波源が近づいてくるとき、聞こえる音はどうなりますか？",
          choices: ["低くなる", "高くなる", "まったく変わらない", "高くなってから低くなる"],
          correct: 1,
          explain: "波源の前では波長が縮んで振動数が大きくなるので、近づくときは高く聞こえます。通り過ぎると遠ざかるので、音が急に低くなります。救急車がそばを通るときに聞こえるのがこれです。"
        }
      },
      {
        t: 0.0,
        near: { target: "slider", label: "音源の速さ vₛ", op: "cross", value: 340 },
        title: "マッハコーンができた",
        hint: "速さが 340 m/s をこえると、波面が広がりきれずに重なって円すいの面になります。注意：波源が通り過ぎるまで、その前方はまったく静かです。",
        quiz: {
          q: "超音速機が音速の 2 倍で飛んできて、あなたはその真下にいます。飛行機が来る前に、エンジンの音は聞こえますか？",
          choices: ["小さいけれど聞こえる", "まったく聞こえない", "こだまが聞こえる", "天気による"],
          correct: 1,
          explain: "超音速のとき、音波はすべて機体の後ろの円すいの面の中にあります。その面があなたのところを通るまでは何も聞こえず、機体が通り過ぎてから大きな衝撃音（ソニックブーム）が聞こえます。"
        }
      }
    ],
    "double-slit": [
      {
        t: 6.0,
        title: "最初の 20 個の光子はまったくランダム",
        hint: "光る点 1 つが光子 1 個です。1 個の光子がどこに当たるかは予測できませんが、点が増えると分布がだんだん見えてきます。",
        quiz: {
          q: "光源から光子を 1 個ずつ出すと、スクリーンの光る点はどう分布しますか？",
          choices: ["2 本の明るい帯にだけ当たる", "完全に一様に散らばる", "ランダムにたまって、だんだん干渉じまが現れる", "すべて中央に当たる"],
          correct: 2,
          explain: "光子 1 個の当たる位置はランダムですが、どこに当たりやすいかは波の性質で決まっていて、数百個たまると干渉じまになります。1 個ずつ当てているのに波の模様ができる。ここが量子のいちばん直感に反するところです。"
        }
      },
      {
        t: 13.0,
        title: "しまが現れた。ここでスリットに検出器を付けると……",
        hint: "検出器を入れると光子がどちらのスリットを通ったかわかり、しまはすぐに消えます。通り道を測ること自体が結果を変えてしまいます。",
        quiz: {
          q: "二重スリットの後ろに検出器を付けて、光子がどちらのスリットを通ったか確かめると、スクリーンには何が見えますか？",
          choices: ["もっとはっきりした干渉じま", "2 本の明るい帯（弾丸のように）", "光る点がまったくない", "しまの幅が広がる"],
          correct: 1,
          explain: "通り道の情報を得たとたん干渉は消え、光子は粒のようにふるまって 2 本の明るい帯にだけたまります。相補性とはこのことで、波の性質と粒子の性質は同じ実験で同時には現れません。"
        }
      }
    ],
    "induction": [
      {
        t: 3.2,
        title: "磁石が真ん中で止まった：磁束は最大なのに起電力は 0",
        hint: "Φ（磁束）と ε（起電力）の 2 つの値を一緒に見てください。磁石がいちばん奥で止まると Φ は最大ですが、そのとき Φ の「変化の割合」は 0 です。",
        quiz: {
          q: "磁石をコイルの真ん中まで入れて止めたとき、誘導起電力はいくらですか？",
          choices: ["最大（磁束が最大だから）", "0（磁束が変化しなくなったから）", "磁束に等しい", "向きが逆になる"],
          correct: 1,
          explain: "ファラデーの法則 ε = −ΔΦ/Δt：起電力を決めるのは磁束の変化の割合で、磁束の大きさではありません。磁石が止まると Φ は最大でも ΔΦ = 0 なので ε = 0 です。磁束が変化しないと電気は起きません。"
        }
      }
    ],
    "gas": [
      {
        t: 5.0,
        title: "圧力は分子が「ぶつかって」生まれる",
        hint: "左のピストンが小刻みにゆれていますか？分子が 1 個ずつぶつかり、その運動量の変化が積み重なったものです。温度を上げて、ぶつかる回数がどれだけ増えるか見てください。",
        quiz: {
          q: "体積を変えずに温度を上げると、圧力が大きくなる直接の原因は何ですか？",
          choices: ["分子が増えた", "分子 1 個 1 個が、より強く、より頻繁にぶつかる", "分子が大きくなった", "分子が止まる"],
          correct: 1,
          explain: "温度が上がる → 分子の平均運動エネルギーが大きくなる → ぶつかる回数が増え、1 回に渡す運動量も大きくなる → 圧力が上がる。気体の圧力は、たくさんの分子が容器の壁にぶつかる効果の平均です。"
        }
      }
    ],
    "ticker-tape": [
      {
        t: 2.4,
        title: "点は 1 つずつ、その瞬間に打たれる",
        hint: "テープを見てください。記録タイマーは 1/60 秒ごとに点を打ちます。台車が速いと点の間隔は広く、遅いと狭くなります。点の間隔が速さの記録です。",
        quiz: {
          q: "記録タイマーは 1/60 秒ごとに点を打ちます。テープの点の間隔がだんだん広くなるのは、台車がどう動いているからですか？",
          choices: ["等速で進む", "加速している", "減速している", "静止"],
          correct: 1,
          explain: "となりの点との時間の間隔は一定なので、間隔が広がるのは同じ時間で進む距離が増えているということ。速さが大きくなっています。"
        }
      }
    ],
    "chase-and-meet": [
      {
        t: 4.0,
        title: "「速度が等しくなる」瞬間に注目",
        hint: "v–t グラフを見てください。2 本の線の交点が、後ろの車の速度が前の車に等しくなる瞬間です。それまでは距離が縮んでいきますが、そのあとは？Δx–t グラフの極値を見ます。",
        quiz: {
          q: "後ろの車は前の車より速く、追いかけています。2 台の速度が等しくなった瞬間、2 台の距離はどうなっていますか？",
          choices: ["最小（ここで追いつかなければ、もう追いつけない）", "最大", "ちょうど 0", "判断できない"],
          correct: 0,
          explain: "速度が等しくなるまでは後ろの車が距離を縮め、そのあとは前の車が離していくので、その瞬間に距離が最小になります。そこで追いついていなければ、その先も追いつけません。"
        }
      }
    ],
    "lens": [
      {
        t: 0.0,
        near: { target: "slider", label: "物体までの距離 u", op: "cross", value: 15 },
        title: "物体の距離が焦点をこえる：実像が虚像に変わる",
        hint: "ろうそくを遠くからゆっくりレンズに近づけます。焦点 f をこえたとたんスクリーンの実像が消え、物体と同じ側に拡大された虚像ができます（レンズの式で求めた q が負になります）。",
        quiz: {
          q: "凸レンズで、ろうそくを焦点より内側に動かすと、スクリーンには何が見えますか？",
          choices: ["倒立で縮小された実像", "像はない（何も見えない）", "スクリーンには実像が映らないが、レンズをのぞくと拡大された虚像が見える", "正立の実像"],
          correct: 2,
          explain: "p < f のとき、1/f = 1/p + 1/q から求めた q は負になります。像は物体と同じ側にできる正立で拡大された虚像で、虫めがねと同じです。スクリーンには映らないので、レンズを通して目で見ます。"
        }
      }
    ],
    "projectile": [
      {
        t: 3.4,
        title: "45° は真空中でいちばん遠くまで飛ぶ角度",
        hint: "同じ速さで、45° とほかの角度の落ちる位置を比べます。次に「空気抵抗」を入れてもう一度。いちばん遠くまで飛ぶ角度はまだ 45° ですか？",
        quiz: {
          q: "空気抵抗があると、いちばん遠くまで飛ぶ発射角はどうなりますか？",
          choices: ["45° のまま", "45° より大きい", "45° より小さい", "角度とは関係ない"],
          correct: 2,
          explain: "空気抵抗は水平方向の速さをずっと減らし続け、長く飛ぶほど失う分が大きくなります。だから角度を少し下げて飛ぶ時間を短くしたほうが遠くまで飛びます。いちばん遠くまで飛ぶ角度はおよそ 40° に下がり、軽い物体と重い物体で結果が違ってきます。"
        }
      }
    ],
    "pendulum": [
      {
        t: 6.0,
        title: "自分で測る：振り子の振れの大きさで周期は変わる？",
        hint: "ストップウォッチと周期の値を見てください。振幅を 30° から 10° にしても周期はほとんど変わりませんが、振り子の長さを半分にすると周期はすぐ短くなります。",
        quiz: {
          q: "単振り子の周期 T は何で決まりますか？（振れが小さいとき）",
          choices: ["振幅が大きいほど T も大きい", "振り子の長さ L と重力加速度 g だけで決まる", "おもりが重いほど T も大きい", "L、g、m のすべてに関係する"],
          correct: 1,
          explain: "T = 2π√(L/g) で、振れが小さければ振幅にも質量にも関係しません。これを振り子の等時性といい、振り子時計はこれを使って時を刻みます。"
        }
      }
    ],
    /* ---------------- 新增：12 個抽象／關鍵時刻實驗 ---------------- */
    "halflife": [
      {
        t: 2.6,
        title: "1 回目の半減期：ちょうど半分が崩壊した？",
        hint: "方眼に残った黄色のマスの数と、グラフの点を見てください。平均すると半分残りますが、サイコロをふるたびに少しずつばらつきます。これが崩壊のランダムさです。",
        quiz: {
          q: "半減期 T½ が 1 回たつと、はじめに 400 個あった原子はおよそ何個残りますか？",
          choices: ["200 個（ちょうど半分）", "0 個（すべて崩壊）", "100 個（4 分の 1）", "決まっていない。全部残ることもある"],
          correct: 0,
          explain: "半減期は統計的な平均です。1 個の原子がいつ崩壊するかはまったくランダムですが、たくさん集まると指数関数的に減り、T½ ごとにおよそ半分になります。"
        }
      },
      {
        t: 6.2,
        title: "半減期が 2 回たった",
        hint: "はじめの 1/4 が残っています。グラフを見ると、0 にどんどん近づきますが、ぴったり 0 にはなりません。",
        quiz: {
          q: "半減期が n 回たつと、はじめの量のどれだけが残りますか？",
          choices: ["1/n", "1/2n", "(1/2)ⁿ", "1 − 1/n"],
          correct: 2,
          explain: "T½ たつごとにさらに半分になるので (1/2)ⁿ です。炭素 14 による年代測定もこの計算を使います。"
        }
      }
    ],
    "standing-wave": [
      {
        t: 4.0,
        title: "動かない点（節）といちばん動く点（腹）",
        hint: "赤い点の所はずっと動きません。これが節です。となり合う節のちょうど真ん中は振幅が最大で、これが腹です。定常波は入射波と反射波が重なってできています。",
        quiz: {
          q: "となり合う 2 つの節の距離は、波長 λ の何倍ですか？",
          choices: ["1 倍", "半分", "4 分の 1", "2 倍"],
          correct: 1,
          explain: "となり合う節の間隔は λ/2 です。弦楽器は弦を押さえると振動する部分の長さが変わり、できる定常波の波長が変わるので、音の高さも変わります。"
        }
      }
    ],
    "beats": [
      {
        t: 5.0,
        title: "音が「ウォン、ウォン」と大きくなったり小さくなったり",
        hint: "上は振動数の近い 2 つの元の波、下は重ね合わせた結果です。重ねた波の外側の形（包絡線）が大きくなったり小さくなったりしています。これがうなりです。",
        quiz: {
          q: "440 Hz と 443 Hz の音さを同時に鳴らすと、何が聞こえますか？",
          choices: ["443 Hz の 1 つの音", "3 Hz のうなり（ウォンウォンという強弱）", "まったく音がしない", "883 Hz"],
          correct: 1,
          explain: "うなりの振動数 = |f₁ − f₂| = 3 Hz で、1 秒に 3 回強弱をくり返します。楽団のチューニングでは、このうなりが消えるまで合わせます。消えたとき 2 つの振動数は同じです。"
        }
      }
    ],
    "resonance": [
      {
        t: 4.5,
        title: "外から加える振動数が固有振動数に近づき、振幅がとても大きくなった",
        hint: "振幅の値とグラフを見てください。外から加える振動数 f が系の固有振動数 f₀ に等しいと、小さな力でも大きな振幅にまで積み重なります。",
        quiz: {
          q: "共振（振幅が最大）が起こるのはどんなときですか？",
          choices: ["外から加える振動数が高いほどよい", "外から加える振動数 = 固有振動数", "押す力が大きいほど起こりやすい", "減衰が大きいほど起こりやすい"],
          correct: 1,
          explain: "押すリズムが、系が自然にゆれるリズムと同じ（f = f₀）だと、毎回運動の向きにそってエネルギーを加えることになり、振幅がどんどん大きくなります。軍隊が橋を渡るときに歩調を乱すのは、そろった足音で橋が共振するのを防ぐためです。"
        }
      }
    ],
    "collision": [
      {
        t: 1.2,
        title: "衝突の瞬間：運動量がやりとりされた",
        hint: "衝突の前と後で、2 台の速さの値を見てください。はね返り係数 e を 1（弾性）と 0（完全非弾性）にして 1 回ずつ走らせ、違いを比べます。",
        quiz: {
          q: "完全非弾性衝突（2 台がくっつく）のあと、系の運動量と運動エネルギーはどうなりますか？",
          choices: ["運動量も運動エネルギーも保存される", "運動量は保存され、運動エネルギーの減り方が最大", "運動エネルギーは保存され、運動量は変わる", "どちらも保存されない"],
          correct: 1,
          explain: "外力がなければ運動量は必ず保存されます。でもくっつくときに運動エネルギーの一部が変形や熱に変わり、運動エネルギーが最も多く失われる衝突になります。自動車のクラッシャブルゾーンは、運動エネルギーを吸収するように作られています。"
        }
      }
    ],
    "photoelectric": [
      {
        t: 0.0,
        near: { target: "slider", label: "当てる光の振動数 f (×10¹⁴ Hz)", op: "cross", value: 5.56 },
        title: "振動数を変える：しきい値より低いと、光をいくら強くしてもだめ",
        hint: "振動数を少しずつ上げてください。限界振動数 f₀ より低いと、光をどれだけ強くしても電子は飛び出しません。f₀ をこえたとたん、電子が出てきます。",
        quiz: {
          q: "光を強くしても振動数が限界振動数より低いままなら、光電流はどうなりますか？",
          choices: ["流れる（光が強ければよい）", "0 のまま", "負になる", "いったん流れてから消える"],
          correct: 1,
          explain: "光子のエネルギー E = hf は振動数だけで決まります。振動数が足りないと、どの光子にも電子を飛び出させるだけのエネルギーがなく、数がいくら多くてもだめです。アインシュタインはこのことから、光がひとかたまりずつのエネルギーを持つと説明しました。"
        }
      }
    ],
    "wave-types": [
      {
        t: 3.5,
        title: "横波と縦波：媒質はどう動く？",
        hint: "横波：媒質は上下に振動し、波は右へ進みます。縦波：媒質は左右に行き来して、疎密ができます。矢印の向きと波の進む向きの関係を見てください。",
        quiz: {
          q: "空気中の音はどちらの波ですか？",
          choices: ["横波（上下に振動）", "縦波（疎と密がくり返す）", "横波でもあり縦波でもある", "波ではない"],
          correct: 1,
          explain: "音は空気が疎と密をくり返しながら押し合って伝わります。空気の振動の向きが進む向きと平行なので、縦波です。ひもを伝わる波は横波です。"
        }
      }
    ],
    "superposition": [
      {
        t: 4.0,
        title: "2 つの波が出会う：重なったあと、またそれぞれ進む",
        hint: "2 つの波が重なる瞬間を見てください。同位相なら高くなり（強め合う干渉）、逆位相なら打ち消し合って平らになります（弱め合う干渉）。離れたあとは、2 つの波とも元の形のまま進んでいきます。",
        quiz: {
          q: "逆位相（山と谷）の 2 つの波が重なった瞬間、何が起こりますか？",
          choices: ["その瞬間だけ変位が打ち消し合って 0 になり、そのあとはそれぞれ元のまま進む", "2 つの波が打ち消し合って、そのまま消える", "振幅が 2 倍になる", "はね返る"],
          correct: 0,
          explain: "弱め合う干渉で、その瞬間の変位は 0 になりますが、2 つの波は消えていません。互いを通り抜けて元のまま進みます。これは波だけの性質で、粒子どうしなら出会うとぶつかってはね返ります。"
        }
      }
    ],
  };

  /* ------------------------------------------------------------------
     UI：觀察卡
     ------------------------------------------------------------------ */
  function buildCard(point, onResume, onAnswered) {
    const backdrop = document.createElement("div");
    backdrop.className = "sim-observe-backdrop";
    const card = document.createElement("div");
    card.className = "sim-observe-card";
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-modal", "false");
    card.setAttribute("aria-label", "観察ポイント");

    const kicker = document.createElement("span");
    kicker.className = "sim-observe-kicker";
    kicker.textContent = point.kicker || "観 察 ポ イ ン ト";
    card.appendChild(kicker);

    const title = document.createElement("h4");
    title.className = "sim-observe-title";
    title.textContent = point.title;
    card.appendChild(title);

    const hint = document.createElement("p");
    hint.className = "sim-observe-hint";
    hint.textContent = point.hint;
    card.appendChild(hint);

    const quiz = point.quiz;
    if (quiz) {
      const q = document.createElement("p");
      q.className = "sim-observe-q";
      q.textContent = quiz.q;
      card.appendChild(q);

      const choices = document.createElement("div");
      choices.className = "sim-observe-choices";
      const result = document.createElement("div");
      result.className = "sim-observe-result";
      result.hidden = true;

      quiz.choices.forEach((text, i) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "sim-observe-choice";
        b.textContent = text;
        b.addEventListener("click", () => {
          const correct = i === quiz.correct;
          choices.querySelectorAll("button").forEach((bb, j) => {
            bb.disabled = true;
            if (j === quiz.correct) bb.classList.add("is-correct");
            else if (j === i) bb.classList.add("is-wrong");
          });
          result.hidden = false;
          result.classList.toggle("is-correct", correct);
          result.innerHTML = "";
          const verdict = document.createElement("strong");
          verdict.textContent = correct ? "正解です。" : "もう一度考えてみよう。";
          const exp = document.createElement("span");
          exp.textContent = quiz.explain;
          result.appendChild(verdict);
          result.appendChild(exp);
          const cont = document.createElement("button");
          cont.type = "button";
          cont.className = "sim-observe-continue";
          cont.textContent = point.resumeText || "再生を続ける ▶";
          cont.addEventListener("click", () => {
            close();
            if (onAnswered) onAnswered(correct);
            onResume();
          });
          result.appendChild(document.createElement("br"));
          result.appendChild(cont);
          if (onAnswered) onAnswered(correct);
        });
        choices.appendChild(b);
      });

      card.appendChild(choices);
      card.appendChild(result);
    }

    const skip = document.createElement("button");
    skip.type = "button";
    skip.className = "sim-observe-skip";
    skip.textContent = point.skipText || "答えずに続ける ▶";
    skip.addEventListener("click", () => { close(); onResume(); });
    card.appendChild(skip);

    function close() { backdrop.remove(); }
    backdrop.appendChild(card);
    return backdrop;
  }

  /* ------------------------------------------------------------------
     引擎：掛進每個實驗建置完成後的生命週期
     ------------------------------------------------------------------ */
  PL._hooks.onBuilt && PL._hooks.onBuilt(function (context) {
    if (document.documentElement.hasAttribute("data-embed-lab")) return;   // 關卡版有自己的題目
    // 教師演示：老師自己掌控節奏，觀察卡會把動畫停下來、蓋住實驗台
    const body = document.body;
    if (body && (body.classList.contains("demo-mode") || body.classList.contains("stage-only"))) return;
    const points = OBSERVE_POINTS[context.id];
    if (!points || !points.length) return;
    const hasLoops = context.loops && context.loops.length > 0;
    const hasNear = points.some(p => p.near);
    // 純靜態實驗（如透鏡成像）沒有動畫迴圈，只剩 near 型可以玩
    if (!hasLoops && !hasNear) return;

    // 重設按鈕要重新武裝觀察點
    let armed = points.map(() => true);
    let busy = false;           // 觀察卡開著時不重複觸發
    let lastT = points.map(() => 0);
    const root = context.root;

    // 入口提示：讓使用者知道這個實驗播放時會有關鍵時刻導覽
    try {
      const briefEl = root.querySelector(".sim-learning-brief");
      if (briefEl) {
        const badge = document.createElement("div");
        badge.className = "sim-observe-badge";
        badge.innerHTML = '<span class="sim-observe-badge-dot"></span>この実験には ' + points.length +
          ' か所の観察ポイントがあります。大事な場面で自動的に止まって質問します。';
        briefEl.appendChild(badge);
      }
    } catch (e) {}

    // 重設時重新武裝
    const resetBtn = root.querySelector(".sim-transport-reset");
    if (resetBtn) resetBtn.addEventListener("click", () => {
      armed = points.map(() => true);
      lastT = points.map(() => 0);
    });

        const lastSide = points.map(() => null);   // near 型：上一 tick 在門檻哪一側
        const previousTick = context.onTick;
        // near 型檢查：播放中（onTick）與暫停中拉滑桿（readout 掃描）都要能觸發
        function readValue(p) {
          if (!p.near) return null;
          const pool = p.near.target === "slider" ? (context.sliders || []) : (context.readouts || []);
          const r = pool.find(x => x.label === p.near.label);
          if (!r) return null;
          const v = p.near.target === "slider" ? (typeof r.read === "function" ? r.read() : (typeof r.get === "function" ? r.get() : r.number)) : r.number;
          return (v == null || typeof v !== "number") ? null : v;
        }
        function checkNear() {
          if (busy) return;
          points.forEach((p, i) => {
            if (!armed[i] || !p.near) return;
            const v = readValue(p);
            if (v == null) return;
            const side = v < p.near.value ? -1 : 1;
            const reached = p.near.op === "gte"
              ? v >= p.near.value                                   // 到達門檻即觸發
              : (lastSide[i] !== null && side !== lastSide[i]);     // cross 型：確實跨過
            if (reached || (lastSide[i] !== null && side !== lastSide[i])) {
              armed[i] = false;
              fire(p);
            }
            lastSide[i] = side;
          });
        }
        context.onTick = function (dt, t) {
          if (previousTick) previousTick(dt, t);
          if (busy) return;
          points.forEach((p, i) => {
            if (!armed[i]) return;
            if (p.near) return;                       // near 型由 checkNear 處理
            let hit = false;
            if (p.t != null) {
              // 越過 t：上一格 < t、這一格 ≥ t
              hit = lastT[i] < p.t && t >= p.t;
            }
            if (hit) {
              armed[i] = false;
              fire(p);
            }
            lastT[i] = t;
          });
          checkNear();
        };
        // 暫停中拉滑桿也會更新讀數：用低頻輪詢捕捉（實驗台是即時重畫的）
        const poll = setInterval(() => {
          if (!root.isConnected) { clearInterval(poll); return; }
          checkNear();
        }, 300);

    function fire(p) {
      if (document.querySelector(".sim-observe-backdrop")) { busy = false; return; }
      // 暫停所有迴圈
      const wasRunning = context.loops.some(l => l.running);
      context.loops.forEach(l => { try { l.stop(); } catch (e) {} });
      busy = true;
      const card = buildCard(p, function onResume() {
        busy = false;
        if (wasRunning) context.loops.forEach(l => { try { l.start(); } catch (e) {} });
      }, function onAnswered(correct) { AUTO.mark(context.id, "play", correct); });
      document.body.appendChild(card);
    }
  });

  /* ==================================================================
     自動觀察點（2026-10）：每一個實驗都有
     ------------------------------------------------------------------
     上面那份手寫表只涵蓋 18 個實驗。其餘的實驗也要在「做到一個階段」時
     停下來問一題觀察題——而且題目必須和學生剛剛親眼看到的東西一致，
     不能是套樣板的「結果會變大／變小」。所以題目的答案一律來自當下量到的讀數：

       ① 播放觀察：播放一段時間（或這一輪自己跑完）時暫停，問
          「剛才播放時，某個讀數是怎麼變的」——一路變大、先大後小、來回振盪…
          答案由播放期間取樣到的讀數序列判定。
       ② 改變參數觀察：暫停中把某根滑桿調了一段、放手之後，問
          「剛才哪個讀數怎麼變了」，答案是調整前後實際量到的差。
          播放中調的不算：讀數本來就隨時間在變，前後相比分不出是誰造成的。

     每個階段每個實驗只問一次（記在 localStorage），完成的進度用事件
     「pl-observe-ready」「pl-observe」通知外層頁面，外層據此更新觀察清單、
     並在觀察完成後引導到最後的「完成實驗」總結題。
     ================================================================== */
  const AUTO = (function () {
    const KEY = "pl-observe-done";
    const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
    const save = v => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} };
    const emit = (name, detail) => { try { window.dispatchEvent(new CustomEvent(name, { detail })); } catch (e) {} };
    return {
      done(id) { return load()[id] || {}; },
      mark(id, stage, correct) {
        const all = load();
        const rec = all[id] || {};
        if (!rec[stage]) rec[stage] = correct ? "right" : "seen";
        else if (correct) rec[stage] = "right";
        all[id] = rec; save(all);
        emit("pl-observe", { id, stage, correct: !!correct, done: rec });
      },
      ready(id, stages) { emit("pl-observe-ready", { id, stages, done: load()[id] || {} }); },
      reset(id) { const all = load(); delete all[id]; save(all); }
    };
  })();
  PL.observe = { done: AUTO.done, reset: AUTO.reset };

  const GLOBAL_INPUT = { down: false, key: 0 };
  try {
    window.addEventListener("pointerdown", () => { GLOBAL_INPUT.down = true; }, true);
    window.addEventListener("pointerup", () => { GLOBAL_INPUT.down = false; }, true);
    window.addEventListener("pointercancel", () => { GLOBAL_INPUT.down = false; }, true);
    window.addEventListener("keydown", e => { if (" sSrR".indexOf(e.key) >= 0 && e.key.length === 1) GLOBAL_INPUT.key = Date.now(); }, true);
  } catch (e) {}
  const QUALITATIVE = /判讀|狀態|判定|模式|提示|結論|是否|檔位|顏色|紀錄|筆數|^4 人がそれぞれ「シミュレーションを見てわかったこと」を 1 文で書きました。「$|^τ = Iα は運動方程式の回転版です。慣性モーメントが大きいほど、回転の状態を変えにくくなります。$|^いくつかのデータをとってから読み取る$|^このまとめを消しました$|^この問題では測定点を続けて記録できます。データの数に上限はありません。記録した点は、関係のグラフに白丸でかかれます。$|^つり合いの判断$|^つり合いは、力のモーメントの合計が 0 かどうかで判断する$|^ばね振り子がつり合いの位置を通る瞬間、エネルギーの状態はどうなっていますか？$|^ひとことでまとめると$|^まず 2 つの物体をひとまとめにして a を求め、f = m₁a で静止摩擦力が足りるか確かめます。$|^まず系が熱を吸収するのか放出するのかを区別し、状態量を 1 つ変えて温度・圧力・体積・エネルギーを見比べます。$|^まず系と基準面を決めます。摩擦や外力、弾性力があるときに、そのまま力学的エネルギー保存則を使えるかを判断します。$|^わからないときはヒント$|^エネルギーの大きさ、波長、量子数を変えて、測定値にしきい値があるか、とびとびになるか、確率的に散らばるかを見ます。$|^オフラインの状態を確認しています…$|^グラフの読み取り$|^データから保存や状態の変化を読み解く$|^データの読み取り$|^バンドギャップで光の色が決まる$|^パラメータを 1 つ動かし、変化を見てから公式に戻って読み解きます。$|^ヒント $|^ヒントがほしい$|^ヒントはここまで$|^ヒントはこれで全部です$|^ヒントを見る$|^ヒント：$|^フル表示$|^フル表示に戻す：課題、手順、読み取りのヒントなどを表示します$|^メーターの測定範囲の状態$|^モデルの読み取り$|^モード$|^何度も振動してから自然に止まる状態$|^何度も測ると統計的なばらつきが読み取れる$|^作者が用意した最初の状態に戻します$|^使うときは名前、元のリンク、ライセンスのリンクを残し、内容を変えたかどうかも書いてください。$|^保存する$|^偏光レンズは色が濃いので、どの向きの光も同じだけ弱まる$|^傾いたカーブでは、垂直抗力の水平成分が向心力になります。速さと傾きの角度を変えて、すべるかどうかを判断します。$|^光の速さが色によって大きく違う$|^光源の明るさと距離は分けて考える$|^光路差 2nt cosθ₂ で、どの色が強め合うかが決まる$|^公開モードです。検索エンジンがすべての内容をインデックスできます。$|^内部エネルギーは状態量$|^再生して、エネルギーの合計が保存されるか見てください。摩擦や非弾性衝突があると合計は減ります。$|^再生中にパラメータを変えると、いまの状態から続きます。「リセット」で最初に戻ります。$|^出典を書き、このページか元のサイトへのリンクを付け、改変したかどうかを書いてください。$|^分布とグラフから量子的な現象を読み解く$|^判断の結果$|^力の判断$|^動きの判断$|^単元データが見つかりません。js\/curriculum\.js を確認してください。$|^同じ時刻の運動エネルギー、位置エネルギー、失われたエネルギーを追いかけて、合計が一定かどうかを比べます。$|^回数は十分：x̄ ± u と書いて提出できる$|^回数は足りているが、ゼロ点が校正されていないので、平均値が全体にずれる$|^回路の状態を変えてメーターを読む$|^壁にはたらく静止摩擦力$|^大学の熱力学：状態方程式、エントロピー、不可逆過程$|^学習の状況$|^干渉の状態$|^平均、ばらつき、残差で読み解く$|^摩擦係数を 0 にします。物体は力がなくても等速のままで、もともとの運動の状態を続けます。$|^操作のヒント：$|^次のヒント（$|^気体の状態$|^液体の粘度が大きいほど色が濃い（水 → グリセリン）$|^減衰が小さい（減衰振動の）とき、振動子の振幅と周期は時間とともにどう変わりますか？$|^温度が高くなると、黒体のスペクトルのピークは短い波長のほうへ移ります。恒星の色から表面温度がわかります。$|^温度は状態を表し、熱量は温度差によって移るエネルギー$|^温度は系の状態を表す量で、熱量はエネルギーが系の境界をこえて移る形の 1 つです。$|^測定の記録$|^測定の記録を消しました。$|^演示モード$|^潜熱は状態を変えるのに使われる$|^点線：前回の記録$|^物体はいまの状態を保とうとする$|^状態$|^目標に達すると自動でクリアになります。$|^系の状態と範囲を決める$|^系の範囲を決めてから、状態量を 1 つだけ変え、熱量と温度を追いかけます。$|^練習モード · そろう目盛りに印をつけません$|^膜の上の面と下の面で反射した光が干渉する。厚さが違うと、強め合う色も違う$|^自動車のサスペンション（ショックアブソーバー）の設計で、いちばん望ましい減衰の状態はどれですか？$|^色は膜の厚さと見る角度で変わる$|^衝突の前と後で速度と向きを比べます。どこまでを系とするか決めてから、合計が変わるかどうかを見ます。$|^観測点 A の地震計の記録（時間軸 0–$|^記録した回数$|^記録を消す$|^説明モード · そろう目盛りに印をつけています$|^読みの分布：回数が多いほど平均値は安定する$|^課題の説明、グラフの読み方のヒント、一歩ずつのガイド付き$|^赤：圧縮　青：引っぱり（色が濃いほど力が大きい）$|^距離センサーは一定時間ごとに人や台車の位置を記録します。そのまま位置－時間グラフが得られ、傾きから速度を読み取れます。$|^選択問題 · エネルギーの状態$|^選択問題 · グラフの読み取り$|^選択問題 · スペクトルの読み取り$|^選択問題 · 保存則の判断$|^選択問題 · 実験の読み取り$|^選択問題 · 比べて判断$|^選択問題 · 端での状態$|^選択問題 · 考え方の判断$|^選択問題 · 記号の読み取り$|^選択問題 · 誤差の読み取り$|^黒体放射と恒星の色$/;
  const TIMELIKE = /時間|經過|^t$|計時|已打點|次數|圈數|計數|^ 分ごとに半分になります。$|^1 回に測る往復の数 n$|^1 回数える$|^50 Hz の交流電源の記録タイマー$|^F 値 N$|^F 値が小さいほど開口は大きい$|^RC 回路によるタイマーと遅延$|^s\/N ≈ 1\/√N：カウント数が多いほど相対誤差は小さいので、長めに測るほうが正確。$|^「1 回数える」を押すと、毎回のカウント数がここにかかれる$|^いま再生したあいだ、「$|^こする回数 N$|^これまで $|^すすめる回数まで一度に測る$|^たった半減期の回数$|^ちょっと止めます：しばらく再生しましたが、測定値は変わりましたか？$|^つり合いの位置を通るときの速さ（最大の速さ）$|^ねじれ振り子の周期 T = 2π√\(I\/κ\)。「400 日時計」は、ねじれ振り子の周期がとても長いことを使って時を刻む$|^ばね振り子がつり合いの位置を通る瞬間、エネルギーの状態はどうなっていますか？$|^まず「温度差」が何回半分になったかを数えて、そこからそのときの水温を求める。$|^まだかなりのカウントが通りぬけている$|^まだ数えていない：「1 回数える」を押して始める$|^カウント数 N$|^カウント数が多いほど相対誤差は小さい$|^カウント数の比 I\/I₀$|^ガイガーカウンター$|^ガイガーカウンターと偶然誤差$|^コイルは電流の変化をさまたげる：スイッチを入れると、電流は時定数 τ = L\/R でだんだん増える$|^ステージによっては毎回数値が変わります$|^テープを記録タイマーに通して一端を台車の後ろに固定する。台車の反対側の糸を滑車にかけ、おもりをつるす。$|^バックグラウンドのカウントを引く$|^上の回数を 5 から 50 に変えて、データの点がばらばらな状態から 1 本の線になっていく様子を見ます。$|^今回のカウント数 N$|^先に記録タイマーを動かす$|^全体のカウント数は約 $|^再生を押す：粒子が 1 個ずつ管に入り、その場で数える$|^分裂の回数の合計$|^半減期 T½ が 1 回たつと、はじめに 400 個あった原子はおよそ何個残りますか？$|^半減期が n 回たつと、はじめの量のどれだけが残りますか？$|^台湾の交流電源は 60 Hz。実験室でよく使う記録タイマーは 50 Hz か 60 Hz が多い$|^各回のカウント数と √N のエラーバー$|^平均のカウント率 R$|^平均のカウント率$|^後ろの車が止まった状態から発進します。速さが等しくなったとき間隔が最大になり、そこから縮みはじめます。$|^打った点の数$|^放射性崩壊はでたらめに起こる：同じ条件でも、毎回カウント数は違う$|^放射線のカウント数は、なぜ毎回違うのか$|^放射線の種類によって、透過力と電離作用が違います。紙、アルミニウム、鉛などでさえぎって、検出器のカウント数を測ります。$|^時刻 t \(s\)$|^時刻 t$|^時刻のカーソル（ドラッグして各時刻を見る）$|^時定数 $|^時定数 RC$|^時定数 τ = RC$|^時定数 τ$|^時定数 τ=L\/R$|^時定数 τ=RC$|^時定数は RC$|^書き出した時刻$|^最後に散乱実験とガイガーカウンターで、原子核と量子のでたらめさを見る。$|^測る区間：$|^測定の回数$|^続けて 8 回数える$|^線源（検出管に近づける→カウント率が大きくなる）$|^自動車のサスペンション（ショックアブソーバー）の設計で、いちばん望ましい減衰の状態はどれですか？$|^蛍光スクリーンで光った回数（散乱角）$|^計算問題 · 毎回数値が変わる$|^記録タイマー$|^記録タイマーの実験のふつうの手順$|^記録タイマーは 1\/60 秒ごとに点を打ちます。テープの点の間隔がだんだん広くなるのは、台車がどう動いているからですか？$|^記録タイマー（速度と加速度を測る）$|^選択問題 · 数え方$|^電熱線（左右に引く：巻き数が多い＝抵抗が大きい）$|^音源が音速をこえると、前にいる観測者には、音源が通りすぎるまでまったく音が聞こえません。$/;
  function nice(v) {
    if (v == null || !isFinite(v)) return "—";
    const a = Math.abs(v);
    if (a !== 0 && (a >= 1e5 || a < 1e-3)) return v.toExponential(2).replace("e", "×10^").replace("+", "");
    return String(Number(v.toPrecision(3)));
  }
  const withUnit = (v, u) => nice(v) + (u ? " " + u : "");
  const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  const TREND = {
    up: "ずっと大きくなる", down: "ずっと小さくなる", updown: "大きくなってから小さくなる", downup: "小さくなってから大きくなる",
    osc: "大きくなったり小さくなったりをくり返す（振動）", flat: "ほとんど変わらない"
  };
  /* 讀數序列的走勢：忽略小於全距 5% 的抖動，數方向轉折幾次 */
  function trendOf(ys) {
    const lo = Math.min.apply(null, ys), hi = Math.max.apply(null, ys);
    const span = hi - lo, scale = Math.max(Math.abs(lo), Math.abs(hi), 1e-12);
    if (span / scale < 0.02) return { kind: "flat", lo, hi, span: 0 };
    const dirs = [];
    let ref = ys[0];
    ys.forEach(y => {
      const d = y - ref;
      if (Math.abs(d) > span * 0.05) { const sg = d > 0 ? 1 : -1; if (dirs[dirs.length - 1] !== sg) dirs.push(sg); ref = y; }
    });
    const kind = dirs.length <= 1 ? (dirs[0] === -1 ? "down" : "up")
      : dirs.length === 2 ? (dirs[0] === 1 ? "updown" : "downup") : "osc";
    return { kind, lo, hi, span: span / scale };
  }
  const usableReadouts = ctx => (ctx.readouts || []).filter(r => r && r.label && !QUALITATIVE.test(r.label));

  function playQuestion(ctx, samples) {
    const rs = usableReadouts(ctx);
    let best = null;
    rs.forEach(r => {
      const ys = samples.map(sm => sm.get(r)).filter(v => typeof v === "number" && isFinite(v));
      if (ys.length < 6) return;
      const tr = trendOf(ys);
      if (tr.kind === "flat") return;
      // 時間、計數這類「本來就一直加」的讀數最沒資訊量，墊底
      const score = tr.span * (TIMELIKE.test(r.label) ? 0.05 : 1) * (tr.kind === "up" || tr.kind === "down" ? 1 : 1.3);
      if (!best || score > best.score) best = { r, ys, tr, score };
    });
    if (!best) return steadyQuestion(ctx, samples, rs);
    const { r, ys, tr } = best;
    const pool = ["up", "down", "updown", "osc", "flat"].filter(k => k !== tr.kind);
    if (tr.kind === "downup") pool.splice(pool.indexOf("updown"), 1, "updown");
    const opts = shuffle([tr.kind].concat(shuffle(pool).slice(0, 3)));
    const y0 = ys[0], y1 = ys[ys.length - 1];
    const how = {
      up: "ずっと増加（" + withUnit(y0, r.unit) + " → " + withUnit(y1, r.unit) + "）",
      down: "ずっと減少（" + withUnit(y0, r.unit) + " → " + withUnit(y1, r.unit) + "）",
      updown: "いったん上がってから下がる（最大 約 " + withUnit(tr.hi, r.unit) + "、最後は " + withUnit(y1, r.unit) + "）",
      downup: "いったん下がってから上がる（最小 約 " + withUnit(tr.lo, r.unit) + "、最後は " + withUnit(y1, r.unit) + "）",
      osc: "上下をくり返す（" + withUnit(tr.lo, r.unit) + " ～ " + withUnit(tr.hi, r.unit) + "）"
    }[tr.kind];
    return {
      kicker: "観 察 ポ イ ン ト · 再 生",
      title: "ちょっと止めます：いま再生したとき、何に気づきましたか？",
      hint: "右の「測定値」の「" + r.label + "」を思い出すか、画面でそれにあたるものがどう動いたかを見てください。",
      resumeText: "再生を続ける ▶",
      quiz: {
        q: "いま再生したあいだ、「" + r.label + "」はどう変わりましたか？",
        choices: opts.map(k => TREND[k]),
        correct: opts.indexOf(tr.kind),
        explain: "実験台で測った結果：「" + r.label + "」の変化は" + how + "。どうしてこう変わるのか考えてみてください。"
      }
    };
  }

  /*
   * 播放期間讀數完全沒變（電流在流、光在走這類穩態畫面）：這本身就是觀察結論——
   * 條件不變，系統就停在穩定狀態；想讓讀數變，得動參數（也就是下一個階段）。
   */
  function steadyQuestion(ctx, samples, rs) {
    const ins = ctx.insight;
    const prefer = ins && ins.primary && ins.primary.readout;
    const cand = (prefer && rs.indexOf(prefer) >= 0 ? [prefer] : []).concat(rs.filter(r => !TIMELIKE.test(r.label)));
    const r = cand.find(x => samples.every(sm => typeof sm.get(x) === "number" && isFinite(sm.get(x))));
    if (!r) return null;
    const v = samples[samples.length - 1].get(r);
    /*
     * 播放中不變的量多半是「由參數決定」的（加速度、終端速度、穩態電流）。
     * 單問「有沒有變」答案永遠是「幾乎不變」，學生很快就會背答案；
     * 探測引擎量過這個讀數對哪根滑桿有反應時，改問「那調這根會怎樣」——
     * 先記下觀察，再預測，下一階段親手驗證。
     */
    const rel = ins && ins.relations ? ins.relations.filter(q => q.readout === r && q.slider && (q.direction === "up" || q.direction === "down"))
      .sort((a, b) => b.relative - a.relative)[0] : null;
    // 現在的讀數落在探測範圍外（例如燈泡已經燒斷、讀數變 0）：當下的狀態和探測時不同，不拿來預測
    const span = rel ? Math.max(Math.abs(rel.max - rel.min), 1e-12) : 0;
    const inRange = rel && v >= rel.min - span * 0.1 && v <= rel.max + span * 0.1;
    if (rel && inRange) {
      return {
        kicker: "観 察 ポ イ ン ト · 再 生",
        title: "ちょっと止めます：「" + r.label + "」は再生中ずっと変わりませんでした",
        hint: "再生中、「" + r.label + "」はずっと " + withUnit(v, r.unit) + " のままでした。画面は動いていますが、この量はパラメータで決まるので、動いているあいだは変わりません。",
        resumeText: "再生を続ける ▶",
        quiz: {
          q: "では「" + rel.slider.label + "」を大きくすると、「" + r.label + "」はどうなる？",
          choices: ["大きくなる", "小さくなる", "ほとんど変わらない"],
          correct: rel.direction === "up" ? 0 : 1,
          explain: "実験台で調べた結果：「" + rel.slider.label + "」を " + withUnit(rel.slider.min, rel.slider.unit) + " から " + withUnit(rel.slider.max, rel.slider.unit) +
            " にすると、「" + r.label + "」は " + withUnit(rel.first, r.unit) + " → " + withUnit(rel.last, r.unit) + "。あとで自分でも動かして確かめてください。"
        }
      };
    }
    const opts = shuffle(["flat"].concat(shuffle(["up", "down", "osc"]).slice(0, 3)));
    return {
      kicker: "観 察 ポ イ ン ト · 再 生",
      title: "ちょっと止めます：しばらく再生しましたが、測定値は変わりましたか？",
      hint: "右の「測定値」の「" + r.label + "」を見てください。画面が動いていても、どの量も変わっているとは限りません。",
      resumeText: "再生を続ける ▶",
      quiz: {
        q: "いま再生したあいだ、「" + r.label + "」はどう変わりましたか？",
        choices: opts.map(k => TREND[k]),
        correct: opts.indexOf("flat"),
        explain: "実験台で測った結果：再生中「" + r.label + "」はずっと " + withUnit(v, r.unit) +
          " のままでした。画面は動いていますが、この量はそのときの条件だけで決まるので、条件が同じなら変わりません。変えたいならパラメータを変えます。次はスライダーを 1 本動かしてみてください。"
      }
    };
  }

  /*
   * 播放中調整：讀數本來就隨時間在變，前後相比分不出是誰造成的，
   * 改用探測引擎（sim-insight）在同一組設定下掃過這根滑桿量到的關係；
   * 而且只挑播放期間「不隨時間變」的讀數（週期、拍頻、穩態電流…），學生看得出來。
   */
  function runningParamQuestion(ctx, slider, x0, x1, steadyLabels) {
    const ins = ctx.insight;
    if (!ins || !ins.relations) return null;
    const rel = ins.relations.filter(q => q.slider === slider && (q.direction === "up" || q.direction === "down") &&
      q.readout && !QUALITATIVE.test(q.readout.label) && steadyLabels.has(q.readout))
      .sort((a, b) => b.relative - a.relative)[0];
    if (!rel) return null;
    const r = rel.readout, up = x1 > x0;
    const grows = (rel.direction === "up") === up;
    return {
      kicker: "観 察 ポ イ ン ト · パ ラ メ ー タ",
      title: "変えたパラメータ：「" + slider.label + "」",
      hint: "「" + slider.label + "」を " + withUnit(x0, slider.unit) + (up ? " から大きくして " : " から小さくして ") + "" + withUnit(x1, slider.unit) + " にしました。実験は動いたままです。",
      resumeText: "実験を続ける ▶",
      skipText: "答えずに実験を続ける ▶",
      quiz: {
        q: "変えたあと、「" + r.label + "」はどう変わりましたか？",
        choices: ["大きくなる", "小さくなる", "ほとんど変わらない"],
        correct: grows ? 0 : 1,
        explain: "実験台で調べた結果：「" + slider.label + "」を " + withUnit(rel.slider.min, slider.unit) + " から " + withUnit(rel.slider.max, slider.unit) +
          " にすると、「" + r.label + "」は " + withUnit(rel.first, r.unit) + " → " + withUnit(rel.last, r.unit) + "。いまの値は " + withUnit(r.number, r.unit) + "。"
      }
    };
  }

  function paramQuestion(ctx, slider, before, after, x0, x1) {
    const rs = usableReadouts(ctx);
    let best = null;
    rs.forEach(r => {
      const a = before.get(r), b = after.get(r);
      if (typeof a !== "number" || typeof b !== "number" || !isFinite(a) || !isFinite(b)) return;
      const scale = Math.max(Math.abs(a), Math.abs(b), 1e-12);
      const rel = Math.abs(b - a) / scale;
      if (rel < 0.01) return;
      const score = rel * (TIMELIKE.test(r.label) ? 0.05 : 1);
      if (!best || score > best.score) best = { r, a, b, rel, score };
    });
    if (!best) return null;
    const { r, a, b } = best;
    const kind = b > a ? 0 : 1;
    const up = x1 > x0;
    let extra = "";
    const ins = ctx.insight;
    if (ins && ins.relations) {
      const rel = ins.relations.find(q => q.slider === slider && q.readout === r);
      const NICE = { "1": "」に比例", "-1": "」に反比例", "2": "」の 2 乗に比例", "-2": "」の 2 乗に反比例", "0.5": "」の平方根に比例", "-0.5": "」の平方根に反比例" };
      if (rel && rel.exponent != null) {
        const k = [1, -1, 2, -2, 0.5, -0.5].find(n => Math.abs(rel.exponent - n) < 0.06);
        if (k != null) extra = "範囲全体を動かしてみると：「" + r.label + "」は「" + slider.label + NICE[String(k)] + "。";
      } else if (rel && rel.direction === "peak") {
        extra = "注意：ずっと増える・ずっと減る関係ではありません。「" + r.label + "」は途中で極値になります。";
      }
    }
    return {
      kicker: "観 察 ポ イ ン ト · パ ラ メ ー タ",
      title: "変えたパラメータ：「" + slider.label + "」",
      hint: "「" + slider.label + "」を " + withUnit(x0, slider.unit) + (up ? " から大きくして " : " から小さくして ") + "" + withUnit(x1, slider.unit) + " にしました。ほかの条件は変えていません。これが条件をそろえるということです。",
      resumeText: "実験を続ける ▶",
      skipText: "答えずに実験を続ける ▶",
      quiz: {
        q: "変えたあと、「" + r.label + "」はどう変わりましたか？",
        choices: ["大きくなる", "小さくなる", "ほとんど変わらない"],
        correct: kind,
        explain: "実験台で測った結果：「" + r.label + "」を " + withUnit(a, r.unit) + " → " + withUnit(b, r.unit) + "。" + extra
      }
    };
  }

  PL._hooks.onBuilt && PL._hooks.onBuilt(function (context, api) {
    const body = document.body;
    if (document.documentElement.hasAttribute("data-embed-lab")) return;
    if (body && (body.classList.contains("demo-mode") || body.classList.contains("stage-only"))) return;
    const id = context.id, root = context.root;
    if (!root || !root.isConnected) return;     // 沒掛在頁面上（測試替身）：不出題，也不留輪詢計時器
    const loops = context.loops || [];
    const handWritten = !!(OBSERVE_POINTS[id] && OBSERVE_POINTS[id].length);
    const sliders = context.sliders || [];
    const stages = [];
    if (loops.length) stages.push("play");
    if (sliders.length) stages.push("param");
    AUTO.ready(id, stages);
    if (!stages.length) return;
    // 任務導讀裡說一聲：學生先知道「做到一半會被問」，操作時才會真的在看
    try {
      const briefEl = root.querySelector(".sim-learning-brief");
      if (briefEl && !briefEl.querySelector(".sim-observe-badge")) {
        const badge = document.createElement("div");
        badge.className = "sim-observe-badge";
        const when = [stages.indexOf("play") >= 0 ? "再生して区切りまで来たとき" : "", stages.indexOf("param") >= 0 ? "パラメータを変えたあと" : ""].filter(Boolean).join("、または");
        badge.innerHTML = '<span class="sim-observe-badge-dot"></span>この実験には観察問題があります：' + when + "に、いま見たことを質問します。終わったら、ページ下の「実験のまとめ」へ進んでください。";
        briefEl.appendChild(badge);
      }
    } catch (e) {}

    let busy = false;
    const anyRunning = () => loops.some(l => l.running);
    const cardOpen = () => busy || !!document.querySelector(".sim-observe-backdrop");   // 手寫觀察點的卡也算
    const snap = () => { const m = new Map(); usableReadouts(context).forEach(r => m.set(r, r.number)); return m; };
    const open = (point, wasRunning, stage) => {
      if (cardOpen()) return false;
      busy = true;
      loops.forEach(l => { try { l.stop(); } catch (e) {} });
      const card = buildCard(point, function onResume() {
        busy = false;
        if (wasRunning) loops.forEach(l => { try { l.start(); } catch (e) {} });
      }, function onAnswered(correct) { AUTO.mark(id, stage, correct); });
      document.body.appendChild(card);
      return true;
    };
    // 指標與鍵盤狀態用模組層的單一監聽器（GLOBAL_INPUT），不在每次建置時往 window 加監聽——
    // 那樣每開一個實驗就多留一組閉包，整個實驗 context 都放不掉。
    let lastUser = 0;
    const builtAt = Date.now();
    root.addEventListener("pointerdown", () => { lastUser = Date.now(); }, true);
    const userAt = () => Math.max(lastUser, GLOBAL_INPUT.key > builtAt ? GLOBAL_INPUT.key : 0);

    /* ---------- ① 播放觀察 ---------- */
    let playArmed = stages.indexOf("play") >= 0 && !handWritten && !AUTO.done(id).play;
    let samples = [], playMs = 0, lastFrame = 0, lastSample = 0, wasRun = false;
    const previousTick = context.onTick;
    let ring = [], lastRing = 0;
    context.onTick = function (dt, t) {
      if (previousTick) previousTick(dt, t);
      const nowR = performance.now();
      if (nowR - lastRing >= 150) { lastRing = nowR; ring.push(snap()); if (ring.length > 16) ring.shift(); }
      if (!playArmed || cardOpen()) return;
      // 進場就自動播放的穩態動畫：學生還沒碰實驗台之前不計時，免得一打開頁面就跳出問題
      if (!userAt() && root.classList.contains("is-ambient")) return;
      const now = performance.now();
      if (lastFrame && now - lastFrame < 200) playMs += now - lastFrame;
      lastFrame = now;
      if (now - lastSample >= 90) { lastSample = now; samples.push(snap()); if (samples.length > 400) samples = samples.filter((_, i) => i % 2 === 0); }
      // 播放滿 4 秒就問；放開把手前不打斷
      if (playMs >= 4000 && !GLOBAL_INPUT.down) firePlay(true);
    };
    function firePlay(running) {
      if (!playArmed || cardOpen()) return;
      const q = samples.length >= 6 ? playQuestion(context, samples) : null;
      if (window.PhysicsLabDebugObserve) console.log("observe-play", id, running, Math.round(playMs), samples.length, !!q);
      if (!q) {
        // 沒有任何可讀的數值讀數：這一階段不出題，免得硬湊
        playArmed = false; AUTO.mark(id, "play", false);
        return;
      }
      if (open(q, running, "play")) playArmed = false;
    }
    // 這一輪自己跑完（落地、跑到終點）而不是學生按暫停：也是提問的好時機
    const pollPlay = setInterval(() => {
      if (!root.isConnected) { clearInterval(pollPlay); clearInterval(pollParam); return; }
      const run = anyRunning();
      if (wasRun && !run && playArmed && !busy && Date.now() - userAt() > 600 && playMs > 900) firePlay(false);
      wasRun = run;
      if (!run) lastFrame = 0;
    }, 250);
    const resetBtn = root.querySelector(".sim-transport-reset");
    if (resetBtn) resetBtn.addEventListener("click", () => { samples = []; playMs = 0; });
    // 離開實驗（api.stop）時停掉輪詢，不留計時器抓著整個實驗不放
    if (api && typeof api.stop === "function") {
      const stop0 = api.stop;
      api.stop = function () { clearInterval(pollPlay); clearInterval(pollParam); return stop0.apply(this, arguments); };
    }

    /* ---------- ② 改變參數觀察 ---------- */
    let paramArmed = stages.indexOf("param") >= 0 && !AUTO.done(id).param;
    let stable = { at: 0, readouts: null, values: null };
    let changing = null, lastInput = 0;
    const sliderVals = () => sliders.map(s => s.read());
    root.addEventListener("input", e => {
      if (!paramArmed || cardOpen()) return;
      const k = sliders.findIndex(s => s.el === e.target);
      if (k < 0) return;
      lastInput = Date.now();
      if (!changing) {
        const base = stable.readouts ? stable : { readouts: snap(), values: sliderVals() };
        // 播放中：記下這段時間裡「不隨時間變」的讀數，之後只拿它們出題
        const steady = new Set();
        if (ring.length >= 4) usableReadouts(context).forEach(r => {
          const ys = ring.map(m => m.get(r)).filter(v => typeof v === "number" && isFinite(v));
          if (ys.length < 4) return;
          const lo = Math.min.apply(null, ys), hi = Math.max.apply(null, ys);
          if ((hi - lo) <= Math.max(Math.abs(lo), Math.abs(hi), 1e-12) * 0.01) steady.add(r);
        });
        changing = { k, before: base.readouts, x0: base.values[k], running: anyRunning(), steady };
      }
      if (anyRunning()) changing.running = true;
    }, true);
    const pollParam = setInterval(() => {
      if (!paramArmed) return;
      const now = Date.now();
      if (!changing) {
        if (now - lastInput > 700 && !cardOpen()) stable = { at: now, readouts: snap(), values: sliderVals() };
        return;
      }
      if (now - lastInput < 900 || GLOBAL_INPUT.down || cardOpen()) return;
      const c = changing; changing = null;
      const s = sliders[c.k];
      const x1 = s.read();
      const range = Math.abs(s.max - s.min) || 1;
      if (Math.abs(x1 - c.x0) < range * 0.08) return;   // 只動一點點：不問
      const running = c.running || anyRunning();
      const q = running ? runningParamQuestion(context, s, c.x0, x1, c.steady)
        : paramQuestion(context, s, c.before, snap(), c.x0, x1);
      if (!q) return;          // 暫停時讀數沒反應（常常只是還沒開始動）：等下一次
      if (open(q, running, "param")) paramArmed = false;
    }, 250);
  });
})();
