/*
 * question-bank.js — 逐題撰寫的練習題庫
 *
 * 背景：原本所有實驗的題目都由同一組樣板產生，誘答選項固定是
 * 「只需背下名詞」「同時改變所有參數」這類明顯錯誤的敘述，
 * 學生用刪去法就能全對，等於沒有評量效果。
 *
 * 這份題庫針對個別實驗撰寫題目，設計原則有三：
 *   1. 誘答選項要對應真實的迷思概念，而不是隨便寫錯。
 *   2. 至少有一題需要實際計算或讀圖，不能只靠語感。
 *   3. 解析要說明「為什麼那個選項會吸引人」，而不只是重述正確答案。
 *
 * 沒有收錄在這裡的實驗，仍會退回 app.js 的樣板題（樣板的誘答選項
 * 已改成同模組其他實驗的重點，至少都是真的物理敘述）。
 *
 * 資料格式：
 *   { type, prompt, formula?, options:[…], correct:index, hint, answer }
 */
(function () {
  "use strict";

  const bank = {

    /* ---------------- 單擺測重力加速度 ---------------- */
    "pendulum-measure-g": [
      {
        type: "單選題 · 實驗設計",
        prompt: "實驗手冊要求「測量 20 次全振動的總時間再除以 20」，而不是直接測 1 次。這樣做最主要的目的是？",
        options: [
          "把按碼錶的反應時間誤差平均分攤到 20 次上，使每次週期的誤差變成原本的 1/20",
          "讓擺錘有足夠時間達到穩定的等速運動",
          "消除空氣阻力對週期造成的影響",
          "使擺角逐漸變小，更接近小角度近似的條件"
        ],
        correct: 0,
        hint: "想想看：不論你測 1 次還是 20 次，按下與停止碼錶的反應誤差都只發生「一次」。",
        answer: "反應誤差約 0.2 s，且不會因為測久而變大。測 1 次時這 0.2 s 全灌在一個週期上；測 20 次後除以 20，誤差只剩 0.01 s。選項 D 描述的振幅衰減確實存在，但那是阻尼效應，不是採用多次計時的理由。"
      },
      {
        type: "計算題 · 由斜率求值",
        prompt: "某組同學把 T² 對 L 作圖，得到通過原點、斜率為 4.0 s²/m 的直線。他們測得的重力加速度最接近？",
        formula: "\\( T^{2}=\\dfrac{4\\pi^{2}}{g}L \\)",
        options: ["9.87 m/s²", "4.00 m/s²", "2.51 m/s²", "39.5 m/s²"],
        correct: 0,
        hint: "斜率等於 4π²/g，所以 g = 4π² ÷ 斜率。",
        answer: "g = 4π²/斜率 = 39.48 / 4.0 ≈ 9.87 m/s²，與公認值 9.80 相當接近。選 4.00 的人是把斜率直接當成 g；選 39.5 的人算了 4π² 卻忘了除以斜率。"
      },
      {
        type: "單選題 · 誤差判讀",
        prompt: "若把擺長只量到繩子末端、忘了加上擺錘的半徑，作圖後最可能看到什麼？",
        options: [
          "直線不通過原點，而是在縱軸上有一段正截距",
          "直線的斜率會變成負值",
          "資料點會散開成一團，看不出直線關係",
          "完全沒有影響，因為斜率不受影響"
        ],
        correct: 0,
        hint: "每一筆的 L 都少量了同一個固定值 r，這是系統誤差不是隨機誤差。",
        answer: "真實關係是 T² =(4π²/g)(L實 + r)。若記錄的 L 都少了 r，整條線會往左平移，於是出現正的縱軸截距。斜率其實仍然正確——這正是「用斜率求 g」比「單點代公式」可靠的原因。"
      }
    ],

    /* ---------------- 彈簧振子測 k ---------------- */
    "spring-measure-k": [
      {
        type: "單選題 · 交叉驗證",
        prompt: "同一條彈簧用靜態法（掛砝碼量伸長）得到 k = 25 N/m，用動態法（量週期）卻得到 k = 23 N/m。最合理的解釋是？",
        options: [
          "彈簧本身也有質量，會一起振動，使實測週期偏長、算出的 k 偏小",
          "靜態法一定比動態法準確，動態法的結果應該直接捨棄",
          "重力加速度在實驗當天發生了變化",
          "兩種方法量的是不同的物理量，本來就不應該相同"
        ],
        correct: 0,
        hint: "動態法的公式假設彈簧沒有質量，全部的慣性都來自砝碼。",
        answer: "考慮彈簧自身質量後，等效振動質量約為 m + m彈簧/3，比 m 大，因此週期偏長、由 T² 斜率反推的 k 偏小。這是可預期的系統誤差，不是量錯。"
      },
      {
        type: "計算題 · 比例推理",
        prompt: "掛 0.2 kg 時週期為 0.6 s。若改掛 0.8 kg（同一條彈簧），週期最接近？",
        formula: "\\( T=2\\pi\\sqrt{m/k} \\)",
        options: ["1.2 s", "0.6 s", "2.4 s", "0.3 s"],
        correct: 0,
        hint: "T 與 √m 成正比，質量變 4 倍時 √m 變幾倍？",
        answer: "質量變 4 倍，√m 變 2 倍，所以 T 變 2 倍 = 1.2 s。選 2.4 s 的人誤以為 T 與 m 成正比。"
      },
      {
        type: "單選題 · 觀念釐清",
        prompt: "把振幅從 2 cm 增加到 6 cm（仍在彈性限度內），週期會如何改變？",
        options: [
          "幾乎不變，因為簡諧運動的週期與振幅無關",
          "變成原本的 3 倍，因為要走的距離變 3 倍",
          "變成原本的 1/3，因為恢復力變大",
          "無法判斷，要看彈簧的材質"
        ],
        correct: 0,
        hint: "振幅變大時，走的距離變長，但恢復力也同比例變大。",
        answer: "距離與恢復力同時放大，兩者效果剛好抵消，因此週期與振幅無關（等時性）。這也是單擺可以拿來當時鐘的原因。"
      }
    ],

    /* ---------------- 斜面法測靜摩擦係數 ---------------- */
    "incline-friction-coefficient": [
      {
        type: "單選題 · 核心推論",
        prompt: "把木塊上再疊一塊同樣的木塊（質量變兩倍），開始滑動的臨界角會如何改變？",
        options: [
          "幾乎不變，因為 mg sinθ 與 μmg cosθ 中的 m 會互相消掉",
          "變為原來的一半，因為重量加倍",
          "變為原來的兩倍，因為摩擦力加倍",
          "會變大，因為正向力變大使摩擦力變大"
        ],
        correct: 0,
        hint: "把「即將滑動」的條件寫成等式，看看質量出現在哪幾項。",
        answer: "即將滑動時 mg sinθc = μs·mg cosθc，兩邊同時有 m，消去後得 tanθc = μs，與質量無關。選 D 的人只看到摩擦力變大，卻忽略下滑的分力也同比例變大。"
      },
      {
        type: "計算題 · 讀角求係數",
        prompt: "木塊在傾角 30° 時開始滑動。此接觸面的靜摩擦係數最接近？",
        formula: "\\( \\mu_s=\\tan\\theta_c \\)",
        options: ["0.58", "0.50", "0.87", "1.73"],
        correct: 0,
        hint: "μs = tan 30°，不是 sin 30° 也不是 cos 30°。",
        answer: "tan 30° = 1/√3 ≈ 0.58。選 0.50 的人算成 sin 30°；選 0.87 的人算成 cos 30°；選 1.73 的人把 tan 60° 誤當成答案。"
      },
      {
        type: "單選題 · 靜摩擦的本質",
        prompt: "當斜面傾角只有 10°（遠小於臨界角）時，木塊受到的靜摩擦力大小為何？",
        options: [
          "等於 mg sin10°，剛好平衡下滑的分力，未達最大值",
          "等於 μs·mg cos10°，永遠是最大靜摩擦力",
          "等於零，因為物體沒有運動",
          "等於 mg，因為要撐住整個重量"
        ],
        correct: 0,
        hint: "靜摩擦力是「被動」的力：需要多少就出多少，直到出不起為止。",
        answer: "靜摩擦力會在 0 到 μsN 之間自動調整，只有在「即將滑動」時才達到最大值。把 μsN 當成靜摩擦力的固定值，是最常見的迷思。"
      }
    ],

    /* ---------------- 導線電阻率 ---------------- */
    "wire-resistivity": [
      {
        type: "計算題 · 比例推理",
        prompt: "一條導線的直徑變為原來的 2 倍、長度也變為原來的 2 倍，電阻會變成原來的幾倍？",
        formula: "\\( R=\\rho\\dfrac{\\ell}{A},\\quad A=\\pi(d/2)^2 \\)",
        options: ["1/2 倍", "1 倍（不變）", "2 倍", "4 倍"],
        correct: 0,
        hint: "長度變 2 倍讓 R 變 2 倍；但直徑變 2 倍會讓截面積變 4 倍。",
        answer: "R ∝ ℓ/A。長度 ×2 使 R ×2，截面積 ×4 使 R ×(1/4)，合計 ×(1/2)。選「不變」的人只把直徑當成一次方，忘了面積和直徑的平方成正比。"
      },
      {
        type: "單選題 · 概念區分",
        prompt: "把一條銅導線剪成兩半，關於「電阻」與「電阻率」的敘述何者正確？",
        options: [
          "電阻變為一半，電阻率不變",
          "電阻與電阻率都變為一半",
          "電阻不變，電阻率變為一半",
          "兩者都不變"
        ],
        correct: 0,
        hint: "電阻率描述的是「這個材料」的性質，和你把它剪成什麼形狀無關。",
        answer: "電阻 R 取決於形狀（長度、截面積），剪半後長度減半故 R 減半；電阻率 ρ 是銅這個材料的固有性質，不因裁剪而改變。"
      },
      {
        type: "單選題 · 應用判斷",
        prompt: "電熱器的發熱線刻意選用鎳鉻合金（ρ ≈ 1.1×10⁻⁶ Ω·m）而不是銅（ρ ≈ 1.7×10⁻⁸ Ω·m）。主要原因是？",
        options: [
          "電阻率高，在相同電流下能產生較大的電阻與較多焦耳熱",
          "電阻率高的材料導電性較好，比較省電",
          "鎳鉻合金比銅便宜很多",
          "銅完全不會發熱，無法用於加熱"
        ],
        correct: 0,
        hint: "發熱功率 P = I²R；要發熱就需要「大」電阻。",
        answer: "同樣長度粗細下，鎳鉻的電阻約是銅的 65 倍，P = I²R 因此大得多。輸電線要的是相反的目標（低電阻、低損耗），所以才用銅。"
      }
    ],

    /* ---------------- 溫度對電阻的影響 ---------------- */
    "resistance-vs-temperature": [
      {
        type: "單選題 · 對比理解",
        prompt: "把金屬電阻與 NTC 熱敏電阻一起放進同一杯升溫的水中，兩者的電阻會如何變化？",
        options: [
          "金屬的電阻上升，熱敏電阻的電阻下降",
          "兩者都上升，只是幅度不同",
          "兩者都下降，只是幅度不同",
          "金屬下降，熱敏電阻上升"
        ],
        correct: 0,
        hint: "金屬的載子數量幾乎固定；半導體升溫則會「解放」出更多載子。",
        answer: "金屬升溫時晶格振動加劇，電子被散射得更頻繁，電阻上升；半導體升溫時大量電子獲得足夠能量成為載子，載子數暴增的效果遠大於散射，電阻因此下降。"
      },
      {
        type: "單選題 · 應用選型",
        prompt: "要設計一個能靈敏偵測 0.1 °C 溫度變化的電路，選用 NTC 熱敏電阻而非白金電阻的主要理由是？",
        options: [
          "同樣的溫度變化下，NTC 的電阻變化量大得多，訊號比較容易量到",
          "NTC 的電阻與溫度成完美的線性關係，換算最方便",
          "NTC 在任何溫度範圍內的準確度都優於白金電阻",
          "NTC 不需要通電就能顯示溫度"
        ],
        correct: 0,
        hint: "靈敏度講的是「每變化 1 °C，輸出改變多少」。",
        answer: "NTC 的靈敏度可達白金電阻的數十倍，適合偵測微小變化；但它是指數關係、非線性，且線性範圍窄。需要寬範圍與高準確度時，工業上仍選用 Pt100。"
      },
      {
        type: "計算題 · 由圖求係數",
        prompt: "金屬電阻的 R–T 圖為一直線，縱軸截距 100 Ω、斜率 0.4 Ω/°C。其溫度係數 α 最接近？",
        formula: "\\( R=R_0(1+\\alpha T)\\;\\Rightarrow\\;R=R_0+R_0\\alpha T \\)",
        options: ["0.004 /°C", "0.4 /°C", "40 /°C", "250 /°C"],
        correct: 0,
        hint: "把公式展開後，斜率是 R₀α，截距是 R₀。",
        answer: "α = 斜率 / 截距 = 0.4 / 100 = 0.004 /°C，正是白金的典型值。直接把斜率當成 α 是最常見的錯誤——單位對不上（Ω/°C 不等於 1/°C）就是警訊。"
      }
    ],

    /* ---------------- 牛頓冷卻定律 ---------------- */
    "newton-cooling": [
      {
        type: "單選題 · 曲線判讀",
        prompt: "90 °C 的熱水在 25 °C 室溫中冷卻。關於降溫曲線，下列敘述何者正確？",
        options: [
          "一開始降得最快，之後越來越慢，並逐漸逼近 25 °C 但不會低於它",
          "以固定的速率等速下降，直到 0 °C 為止",
          "一開始降得最慢，接近室溫時反而加速下降",
          "會先降到室溫以下，再回升到室溫"
        ],
        correct: 0,
        hint: "散熱速率正比於「目前溫度與室溫的差」。溫差越小，還剩多少推動力？",
        answer: "溫差是散熱的驅動力，隨著水溫接近室溫，溫差趨近於零，降溫也隨之趨緩。室溫是這條指數曲線的水平漸近線。"
      },
      {
        type: "計算題 · 半衰概念",
        prompt: "室溫 20 °C。熱水從 80 °C 降到 50 °C 花了 6 分鐘。再從 50 °C 降到 35 °C 大約需要多久？",
        options: ["約 6 分鐘", "約 3 分鐘", "約 12 分鐘", "無法估計"],
        correct: 0,
        hint: "算出每一段的「溫差」：80−20 = 60，50−20 = 30，35−20 = 15。",
        answer: "溫差從 60 降到 30 是減半，再從 30 降到 15 也是減半。指數衰減的「半衰時間」為定值，所以同樣約 6 分鐘。這和放射性半衰期是完全相同的數學結構。"
      },
      {
        type: "單選題 · 資料處理",
        prompt: "為什麼實驗課要把資料改畫成 ln(T − T環境) 對 t 的圖，而不是直接看原始的降溫曲線？",
        options: [
          "指數關係取對數後變成直線，可以直接由斜率讀出散熱常數 k",
          "取對數可以消除溫度計本身的讀數誤差",
          "原始曲線的資料點太少，取對數可以增加資料點",
          "因為溫度必須取對數才有物理意義"
        ],
        correct: 0,
        hint: "人眼很難判斷一條曲線「彎多少」，但很容易判斷一條直線斜多少。",
        answer: "把非線性關係「線性化」是實驗資料處理的通用手法：直線的斜率與截距可用最小平方法客觀求得，也能一眼看出哪些資料點偏離趨勢。"
      }
    ],

    /* ---------------- 凸透鏡焦距量測 ---------------- */
    "lens-focal-measurement": [
      {
        type: "計算題 · 成像公式",
        prompt: "焦距 15 cm 的凸透鏡，物體放在 20 cm 處。像距與放大率各為多少？",
        formula: "\\( \\dfrac{1}{u}+\\dfrac{1}{v}=\\dfrac{1}{f} \\)",
        options: [
          "v = 60 cm，放大率 3 倍（倒立實像）",
          "v = 8.6 cm，放大率 0.43 倍（倒立實像）",
          "v = 35 cm，放大率 1.75 倍（正立虛像）",
          "v = 60 cm，放大率 3 倍（正立虛像）"
        ],
        correct: 0,
        hint: "1/v = 1/15 − 1/20，先通分再取倒數；放大率 = |v/u|。",
        answer: "1/v = 1/15 − 1/20 = (4−3)/60 = 1/60，故 v = 60 cm，放大率 = 60/20 = 3。物距介於 f 與 2f 之間時，必得放大的倒立實像——能投在紙屏上的一定是實像。"
      },
      {
        type: "單選題 · 圖形判讀",
        prompt: "把多組資料畫成 1/v 對 1/u 的圖，理論上這條直線的斜率應該是多少？",
        options: [
          "−1，因為 1/v = −1/u + 1/f",
          "+1，因為兩者成正比",
          "等於焦距 f",
          "等於 1/f"
        ],
        correct: 0,
        hint: "把成像公式移項，整理成 y = mx + b 的形式。",
        answer: "1/u + 1/v = 1/f 移項得 1/v = −(1/u) + 1/f，斜率為 −1、截距為 1/f。斜率若明顯偏離 −1，代表量測有系統誤差（例如透鏡位置的基準點抓錯）。"
      },
      {
        type: "單選題 · 現象解釋",
        prompt: "把物體逐漸移近焦點時，紙屏必須一直往後退才能看到清晰的像。原因是？",
        options: [
          "物距趨近 f 時 1/u 趨近 1/f，使 1/v 趨近 0，像距因此趨向無限遠",
          "透鏡的焦距會隨著物體靠近而變長",
          "光線在靠近焦點時會變慢，需要更多時間到達",
          "像會從實像變成虛像，所以要往後找"
        ],
        correct: 0,
        hint: "看 1/v = 1/f − 1/u 這個式子：當 u → f 時右邊會怎樣？",
        answer: "u → f 時 1/v → 0，也就是 v → ∞：光線離開透鏡後接近平行。這正是投影機、探照燈把光源放在焦點附近的原理。物體再更靠近（u < f）則不再成實像，改成正立放大虛像——放大鏡的用法。"
      }
    ],

    /* ---------------- 共鳴管測聲速 ---------------- */
    "resonance-tube-sound-speed": [
      {
        type: "計算題 · 共鳴長度",
        prompt: "用 512 Hz 音叉在一端開口的管子上找到第一共鳴點，空氣柱長約 16.5 cm。忽略端點修正時，聲速最接近？",
        formula: "\\( L=\\dfrac{\\lambda}{4},\\quad v=f\\lambda \\)",
        options: ["338 m/s", "84 m/s", "1352 m/s", "169 m/s"],
        correct: 0,
        hint: "第一共鳴時 L = λ/4，所以 λ = 4L，再用 v = fλ。",
        answer: "λ = 4 × 0.165 = 0.66 m，v = 512 × 0.66 ≈ 338 m/s，接近室溫下的 343 m/s。選 84 m/s 的人把 L 直接當成波長；選 1352 的人多乘了一次 4。"
      },
      {
        type: "單選題 · 駐波結構",
        prompt: "在一端開口、一端為水面的共鳴管中，波腹與波節分別出現在哪裡？",
        options: [
          "開口端是波腹，水面是波節",
          "開口端是波節，水面是波腹",
          "兩端都是波腹",
          "兩端都是波節"
        ],
        correct: 0,
        hint: "水面是硬邊界，空氣分子在那裡無法振動。",
        answer: "水面不允許空氣分子位移，因此是位移的波節；開口端可以自由振動，是波腹。從波腹到最近波節剛好是 λ/4，這就是 L = λ/4 的由來。"
      },
      {
        type: "單選題 · 誤差來源",
        prompt: "多組資料畫出 L 對 1/f 的圖後，直線並未通過原點，而是有一小段負截距。最合理的解釋是？",
        options: [
          "管口的端點修正：實際的有效長度比量到的 L 多了約 0.6r",
          "音叉的頻率標示全部都印錯了",
          "聲速在不同頻率下差異極大",
          "作圖時的縱軸單位選錯了"
        ],
        correct: 0,
        hint: "真實關係是 L + 0.6r = v/(4f)，把 L 移到一邊看看截距是什麼。",
        answer: "L = (v/4)(1/f) − 0.6r，截距即 −0.6r，是管半徑造成的系統誤差。斜率不受影響，所以由斜率求聲速仍然可靠——又一次說明「求斜率」比「單點代公式」穩健。"
      }
    ]
  };

  /* =========================================================================
     隨機化計算題（Physics Aviary 式）

     選擇題再怎麼寫，學生都可能靠刪去法過關；而且同學之間答案一樣，
     很容易互相對答案而不是自己算。這一組題目每次開啟時數值都不同，
     學生必須真的動筆算出一個數字並輸入，系統以相對容差判斷對錯。

     每題提供 generate(rand)：
       · rand(min, max, step) 產生這次的題目數值
       · 回傳 { values, answer, unit, tolerance, prompt, steps }
     steps 是逐步解法，只有在學生答對或主動要求時才顯示。
     ========================================================================= */
  const numericBank = {
    "pendulum-measure-g": {
      type: "計算題 · 每次數值不同",
      unit: "m/s²",
      tolerance: 0.03,
      hint: "先由「總時間 ÷ 次數」得到單一週期 T，再從 T = 2π√(L/g) 解出 g。",
      generate(rand) {
        const L = rand(0.40, 1.20, 0.05);
        const n = rand(10, 30, 5);
        const g = 9.80;
        const T = 2 * Math.PI * Math.sqrt(L / g);
        const total = T * n;
        return {
          prompt: "某同學把單擺擺長調到 " + L.toFixed(2) + " m，測量 " + n +
            " 次全振動共花了 " + total.toFixed(2) + " s。請由這組數據求出重力加速度 g。",
          answer: g,
          steps: [
            "單一週期 T = " + total.toFixed(2) + " ÷ " + n + " = " + T.toFixed(4) + " s",
            "由 T = 2π√(L/g) 平方得 T² = 4π²L/g",
            "移項 g = 4π²L / T² = 4π² × " + L.toFixed(2) + " ÷ " + T.toFixed(4) + "² ",
            "g ≈ " + g.toFixed(2) + " m/s²"
          ]
        };
      }
    },

    "incline-friction-coefficient": {
      type: "計算題 · 每次數值不同",
      unit: "",
      tolerance: 0.03,
      hint: "臨界角的正切值就是靜摩擦係數，質量是多餘條件。",
      generate(rand) {
        const deg = rand(14, 40, 1);
        const mass = rand(0.4, 2.4, 0.2);
        const mu = Math.tan(deg * Math.PI / 180);
        return {
          prompt: "質量 " + mass.toFixed(1) + " kg 的木塊放在可調傾角的斜面上。緩慢抬升斜面，當傾角達到 " +
            deg + "° 時木塊開始下滑。求此接觸面的靜摩擦係數 μs。",
          answer: mu,
          steps: [
            "即將滑動時：mg sinθc = μs · mg cosθc",
            "兩邊的 m 與 g 相消 → μs = tanθc（所以 " + mass.toFixed(1) + " kg 是多餘條件）",
            "μs = tan " + deg + "° ≈ " + mu.toFixed(3)
          ]
        };
      }
    },

    "wire-resistivity": {
      type: "計算題 · 每次數值不同",
      unit: "Ω",
      tolerance: 0.04,
      hint: "先由直徑算截面積 A = π(d/2)²，注意 mm 要換成 m，再代 R = ρℓ/A。",
      generate(rand) {
        const len = rand(0.5, 2.5, 0.1);
        const dmm = rand(0.3, 1.0, 0.1);
        const rho = 1.10e-6;                    // 鎳鉻合金
        const A = Math.PI * Math.pow(dmm / 2000, 2);
        const R = rho * len / A;
        return {
          prompt: "一條鎳鉻合金導線（ρ = 1.10×10⁻⁶ Ω·m）長 " + len.toFixed(1) +
            " m、直徑 " + dmm.toFixed(1) + " mm。求它的電阻 R。",
          answer: R,
          steps: [
            "半徑 r = " + dmm.toFixed(1) + " mm ÷ 2 = " + (dmm / 2).toFixed(2) + " mm = " + (dmm / 2000).toExponential(2) + " m",
            "截面積 A = πr² = " + A.toExponential(3) + " m²",
            "R = ρℓ/A = 1.10×10⁻⁶ × " + len.toFixed(1) + " ÷ " + A.toExponential(3),
            "R ≈ " + R.toFixed(2) + " Ω"
          ]
        };
      }
    },

    "lens-focal-measurement": {
      type: "計算題 · 每次數值不同",
      unit: "cm",
      tolerance: 0.03,
      hint: "用 1/u + 1/v = 1/f，先算 1/v 再取倒數。單位全部用 cm 就不必換算。",
      generate(rand) {
        const f = rand(10, 20, 1);
        const u = rand(f * 1.3, f * 3.2, 1);
        const v = 1 / (1 / f - 1 / u);
        return {
          prompt: "焦距 " + f + " cm 的凸透鏡，物體放在透鏡前 " + u +
            " cm 處。求成像位置（像距 v，取正值表示在透鏡另一側）。",
          answer: v,
          steps: [
            "1/v = 1/f − 1/u = 1/" + f + " − 1/" + u,
            "1/v = " + (1 / f).toFixed(5) + " − " + (1 / u).toFixed(5) + " = " + (1 / v).toFixed(5),
            "v = " + v.toFixed(2) + " cm（正值＝實像，位於透鏡另一側）",
            "放大率 |v/u| = " + Math.abs(v / u).toFixed(2) + " 倍，倒立"
          ]
        };
      }
    },

    "resonance-tube-sound-speed": {
      type: "計算題 · 每次數值不同",
      unit: "m/s",
      tolerance: 0.03,
      hint: "第一共鳴時空氣柱長 L = λ/4，先求 λ 再用 v = fλ。此題忽略端點修正。",
      generate(rand) {
        const f = rand(256, 1024, 32);
        const room = rand(10, 35, 1);
        // 聲速隨溫度變化：v ≈ 331 + 0.6T，順便讓學生看到室溫要一併記錄的理由
        const v = 331 + 0.6 * room;
        const L = v / (4 * f);
        return {
          prompt: "室溫 " + room + " °C。用 " + f + " Hz 的音叉在一端開口的共鳴管上調整水位，" +
            "第一次聽到明顯共鳴時空氣柱長為 " + (L * 100).toFixed(1) + " cm。求當時的聲速（忽略端點修正）。",
          answer: v,
          steps: [
            "第一共鳴：L = λ/4 → λ = 4L = 4 × " + L.toFixed(4) + " = " + (4 * L).toFixed(3) + " m",
            "v = fλ = " + f + " × " + (4 * L).toFixed(3),
            "v ≈ " + v.toFixed(1) + " m/s",
            "對照理論值 v = 331 + 0.6 × " + room + " = " + v.toFixed(1) + " m/s，兩者一致"
          ]
        };
      }
    },

    "newton-cooling": {
      type: "計算題 · 每次數值不同",
      unit: "°C",
      tolerance: 0.03,
      hint: "先算出「溫差」隨時間減半的次數，再回推當時的水溫。",
      generate(rand) {
        const env = rand(18, 28, 1);
        const start = rand(70, 95, 5);
        const half = rand(4, 10, 1);
        const halves = rand(1, 3, 1);
        const elapsed = half * halves;
        const temp = env + (start - env) / Math.pow(2, halves);
        return {
          prompt: "室溫 " + env + " °C。一杯 " + start + " °C 的熱水，其「與室溫的溫差」每 " +
            half + " 分鐘減半。請問經過 " + elapsed + " 分鐘後，水溫是幾 °C？",
          answer: temp,
          steps: [
            "起始溫差 ΔT₀ = " + start + " − " + env + " = " + (start - env) + " °C",
            elapsed + " 分鐘 ÷ " + half + " 分鐘 = " + halves + " 個半衰期",
            "剩餘溫差 = " + (start - env) + " ÷ 2^" + halves + " = " + ((start - env) / Math.pow(2, halves)).toFixed(2) + " °C",
            "水溫 = 室溫 + 剩餘溫差 = " + env + " + " + ((start - env) / Math.pow(2, halves)).toFixed(2) + " ≈ " + temp.toFixed(2) + " °C"
          ]
        };
      }
    },

    "spring-measure-k": {
      type: "計算題 · 每次數值不同",
      unit: "N/m",
      tolerance: 0.03,
      hint: "由 T = 2π√(m/k) 平方後移項求 k。",
      generate(rand) {
        const m = rand(0.15, 0.90, 0.05);
        const k = rand(12, 40, 2);
        const T = 2 * Math.PI * Math.sqrt(m / k);
        return {
          prompt: "在一條彈簧下掛 " + m.toFixed(2) + " kg 的砝碼，測得振動週期為 " +
            T.toFixed(3) + " s。求這條彈簧的彈性常數 k。",
          answer: k,
          steps: [
            "T = 2π√(m/k) → T² = 4π²m/k",
            "k = 4π²m / T² = 4π² × " + m.toFixed(2) + " ÷ " + T.toFixed(3) + "²",
            "k ≈ " + k.toFixed(1) + " N/m"
          ]
        };
      }
    },

    "resistance-vs-temperature": {
      type: "計算題 · 每次數值不同",
      unit: "Ω",
      tolerance: 0.03,
      hint: "金屬電阻 R = R₀(1 + αT)，把已知的 R₀、α 與 T 直接代入。",
      generate(rand) {
        const R0 = rand(80, 120, 5);
        const alpha = 0.00393;
        const T = rand(20, 100, 10);
        const R = R0 * (1 + alpha * T);
        return {
          prompt: "一個白金電阻在 0 °C 時的電阻為 " + R0 + " Ω，溫度係數 α = 0.00393 /°C。" +
            "求它在 " + T + " °C 時的電阻。",
          answer: R,
          steps: [
            "R = R₀(1 + αT)",
            "R = " + R0 + " × (1 + 0.00393 × " + T + ")",
            "R = " + R0 + " × " + (1 + alpha * T).toFixed(5),
            "R ≈ " + R.toFixed(2) + " Ω"
          ]
        };
      }
    }
  };

  /*
   * 依種子產生可重現的隨機值：同一個學生同一天重新整理會拿到同一題，換人或隔天才換題。
   *
   * 這裡用 splitmix32：單純的線性同餘產生器對「相鄰種子」的第一個輸出幾乎一樣
   * （只差 1/2^32），量化到 step 之後常常落在同一格，會出現「按了換一題卻沒換」。
   * splitmix32 每一步都做雪崩混合，相鄰種子產生的序列完全不同。
   */
  function seededRandom(seed) {
    let state = (seed >>> 0) || 1;
    return function rand(min, max, step) {
      state = (state + 0x9e3779b9) >>> 0;
      let z = state;
      z = Math.imul(z ^ (z >>> 16), 0x21f0aaad) >>> 0;
      z = Math.imul(z ^ (z >>> 15), 0x735a2d97) >>> 0;
      z = (z ^ (z >>> 15)) >>> 0;
      const r = z / 4294967296;
      if (!step) return min + (max - min) * r;
      const steps = Math.floor((max - min) / step);
      return min + Math.round(r * steps) * step;
    };
  }

  function buildNumericQuestion(id, seed) {
    const spec = numericBank[id];
    if (!spec) return null;
    const data = spec.generate(seededRandom(seed));
    return Object.assign({
      kind: "numeric",
      type: spec.type,
      unit: spec.unit,
      tolerance: spec.tolerance,
      hint: spec.hint
    }, data);
  }

  // 簡單驗證：格式錯誤時在主控台明確報出來，避免題目靜默壞掉。
  const problems = [];
  Object.entries(bank).forEach(([id, questions]) => {
    if (!Array.isArray(questions) || !questions.length) { problems.push(id + "：沒有題目"); return; }
    questions.forEach((q, i) => {
      const where = id + " 第 " + (i + 1) + " 題";
      if (!q.prompt) problems.push(where + "：缺少題幹");
      if (!Array.isArray(q.options) || q.options.length < 3) problems.push(where + "：選項不足");
      if (!(q.correct >= 0 && q.correct < (q.options || []).length)) problems.push(where + "：正解索引超出範圍");
      if (!q.answer) problems.push(where + "：缺少解析");
      if (new Set(q.options || []).size !== (q.options || []).length) problems.push(where + "：有重複選項");
    });
  });
  if (problems.length) console.error("題庫格式檢查未通過", problems);

  window.PhysicsLabQuestionBank = bank;
  window.PhysicsLabNumericBank = numericBank;
  window.PhysicsLabBuildNumericQuestion = buildNumericQuestion;
  window.PhysicsLabQuestionBankAudit = {
    experiments: Object.keys(bank).length,
    numeric: Object.keys(numericBank).length,
    problems
  };
})();
