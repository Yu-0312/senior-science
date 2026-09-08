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
        title: "注意看：小球爬得上去，但過得了環頂嗎？",
        hint: "盯著環頂位置的軌道。h = 2.5R 時小球剛好能把軌道「貼著」通過——注意它通過環頂時的速度還剩多少。",
        quiz: {
          q: "小球剛好在環頂不脫軌的條件，是釋放高度 h 至少要等於多少 R？",
          choices: ["2R", "2.5R", "3R", "4R"],
          correct: 1,
          explain: "h ≥ 2.5R 才過得去。h = 2R 只保證「爬得到環頂」（速率為零），但那裡需要的向心力沒有來源，會先脫軌——「爬得上去」和「過得去」是兩個條件。"
        }
      }
    ],
    "doppler": [
      {
        t: 4.5,
        title: "波前開始擠在一起了",
        hint: "波源在動，它前方的波被「壓縮」、後方被「拉開」。看波前圓弧的間距：前方密、後方疏。",
        quiz: {
          q: "波源朝你而來時，你聽到的聲音會——",
          choices: ["變低沉", "變高亢", "完全不變", "先高後低"],
          correct: 1,
          explain: "前方波長被壓短、頻率變高，所以接近時聽起來偏高；經過之後轉為遠離，聲音驟降——救護車鳴笛擦身的瞬間就是這個效應。"
        }
      },
      {
        t: 11.5,
        title: "馬赫錐形成了！",
        hint: "速度超過 340 m/s 之後，波前來不及散開，疊成一個錐面。注意：波源前方在它經過之前是完全安靜的。",
        quiz: {
          q: "超音速飛機以兩倍音速飛來，你站在它的航線正下方。它在抵達之前你聽得到引擎聲嗎？",
          choices: ["聽得到，只是很小聲", "完全聽不到", "聽得到回音", "要看天氣"],
          correct: 1,
          explain: "馬赫錐的錐尖還沒掃過你之前，所有的聲波都還沒到——超音速物體「把聲音留在身後」，所以它抵達後才會聽到震耳的音爆。"
        }
      }
    ],
    "double-slit": [
      {
        t: 6.0,
        title: "前 20 顆光子完全隨機",
        hint: "每一次亮點就是「一顆光子」。單顆光子落在哪裡無法預測——但螢幕上的分布正在悄悄成形。",
        quiz: {
          q: "把光源調到一次只發一顆光子，螢幕上的亮點會——",
          choices: ["只落在兩條亮帶上", "完全均勻散開", "隨機累積，逐漸浮現干涉條紋", "全部落在中央"],
          correct: 2,
          explain: "單顆光子的落點是隨機的，但機率分布由波動決定——累積數百顆後，干涉條紋自己浮現。這就是「量子」最反直覺的地方。"
        }
      },
      {
        t: 13.0,
        title: "條紋出現了。現在在縫上裝偵測器……",
        hint: "偵測器一開，我們「知道」每顆光子走了哪條縫——條紋立刻消失。觀察本身就是干擾。",
        quiz: {
          q: "在雙縫後方裝上偵測器、確認每顆光子走哪條縫之後，螢幕上會出現——",
          choices: ["更清晰的干涉條紋", "兩條亮帶（像子彈一樣）", "完全沒有亮點", "條紋變寬"],
          correct: 1,
          explain: "一旦取得路徑資訊，波動性干涉就消失——光子表現得像顆粒，只在兩條亮帶累積。這是互補原理最直接的展示。"
        }
      }
    ],
    "induction": [
      {
        t: 3.2,
        title: "磁鐵正中央：磁通量最大，但電動勢是零！",
        hint: "同時看 Φ（磁通量）和 ε（電動勢）兩個讀數。磁鐵停在最裡面時 Φ 最大，但那時 Φ 的「變化率」是零。",
        quiz: {
          q: "磁鐵插到線圈正中央不動的那一刻，感應電動勢是——",
          choices: ["最大（因為磁通量最大）", "零（因為磁通量不再變化）", "等於磁通量", "方向反轉"],
          correct: 1,
          explain: "法拉第定律說 ε = −ΔΦ/Δt：發電靠的是「變化率」，不是大小。磁鐵靜止時 Φ 最大但 ΔΦ = 0，所以 ε = 0——這就是「變化才會發電」。"
        }
      }
    ],
    "gas": [
      {
        t: 5.0,
        title: "壓力是分子「撞」出來的",
        hint: "左側活塞在動？那是單顆分子撞擊的動量變化累積出來的。把溫度調高，看看單位時間的撞擊變得多久一次。",
        quiz: {
          q: "等體積下把氣體溫度升高，壓力變大的直接原因是——",
          choices: ["分子變多了", "每顆分子撞得更用力、更頻繁", "分子變大了", "分子停止運動"],
          correct: 1,
          explain: "溫度升高 → 分子平均動能變大 → 撞擊更頻繁且每次傳遞的動量更大 → 壓力上升。壓力不是公式算出來的，是統計撞擊撞出來的。"
        }
      }
    ],
    "ticker-tape": [
      {
        t: 2.4,
        title: "每個點都是「當場」打出來的",
        hint: "看紙帶：計時器每 1/60 秒打一個點。小車跑得快，點距就寬；跑得慢，點距就窄。點距就是速度的紀錄。",
        quiz: {
          q: "打點計時器正常運作時（每 1/60 秒打一點），紙帶上「點距越來越寬」代表小車——",
          choices: ["等速前進", "加速中", "減速中", "靜止"],
          correct: 1,
          explain: "相鄰兩點的時間間隔固定，距離越來越寬 = 相同時間內位移越大 = 速度越來越快。點距就是一條「看得見的速度紀錄」。"
        }
      }
    ],
    "chase-and-meet": [
      {
        t: 4.0,
        title: "注意「速度相等」的那一刻",
        hint: "看 v–t 圖：兩條線交點就是後車速度等於前車的瞬間。那一刻之前距離在縮小，之後呢？看 Δx–t 圖的極值。",
        quiz: {
          q: "後車比前車快，一直追。在「兩車速度相等」的那一刻，兩車距離是——",
          choices: ["最小值（還沒追上就永遠追不上了）", "最大值", "剛好等於零", "無法判斷"],
          correct: 0,
          explain: "速度相等之前後車不斷縮短距離，相等之後前車又拉開——所以那一刻距離最小。若那一刻還沒追上，之後就永遠追不上了。"
        }
      }
    ],
    "lens": [
      {
        t: 0.0,
        near: { target: "slider", label: "物距 u", op: "cross", value: 15 },
        title: "物距越過焦距：實像翻轉了！",
        hint: "把蠟燭從遠處慢慢拉近透鏡。跨過焦距 f 的瞬間，屏上的實像消失、變成同側放大的虛像——成像公式分母變號了。",
        quiz: {
          q: "凸透鏡成像中，蠟燭移到「焦距以內」時，屏上會——",
          choices: ["出現倒立縮小實像", "沒有像（什麼都沒有）", "接收不到實像，但透過透鏡看得到放大虛像", "出現正立實像"],
          correct: 2,
          explain: "u < f 時 1/f = 1/p + 1/q 的 q 變負——像成在物體同側，是放大的正立虛像（放大鏡模式）。實像接不到、要用眼睛透過透鏡看。"
        }
      }
    ],
    "projectile": [
      {
        t: 3.4,
        title: "45° 是真空中的最遠角度",
        hint: "同一速度下比較 45° 和其他角度的落點。接著打開「空氣阻力」再試一次——最遠角度還是 45° 嗎？",
        quiz: {
          q: "有空氣阻力時，最遠落點的發射角會——",
          choices: ["仍為 45°", "大於 45°", "小於 45°", "與角度無關"],
          correct: 2,
          explain: "空氣阻力「吃掉」水平方向的留存速度，讓稍低的角度反而飛更遠——最遠角度降到約 40°，而且輕重物體的差異第一次變得有影響。"
        }
      }
    ],
    "pendulum": [
      {
        t: 6.0,
        title: "自己量：擺的角度大小影響週期嗎？",
        hint: "看碼錶與週期讀數。把振幅從 30° 改到 10°，週期幾乎不變——但把擺長減半，週期馬上變短。",
        quiz: {
          q: "單擺的週期 T 由什麼決定？（小角度近似）",
          choices: ["振幅越大 T 越大", "只由擺長 L 與重力 g 決定", "擺錘質量越大 T 越大", "跟 L、g、m 都有關"],
          correct: 1,
          explain: "T = 2π√(L/g)——小角度下與振幅、質量都無關。這就是伽利略的「等時性」，也是機械鐘據此計時的原理。"
        }
      }
    ],
    /* ---------------- 新增：12 個抽象／關鍵時刻實驗 ---------------- */
    "halflife": [
      {
        t: 3.2,
        title: "第一個半衰期：正好一半衰變了嗎？",
        hint: "看方格裡剩下的黃格數與曲線上的點。統計說「平均剩一半」，但每一次擲骰都有一點起伏——這就是輻射計數的隨機性。",
        quiz: {
          q: "經過一個半衰期 T½ 後， 原本 400 顆原子大約剩幾顆？",
          choices: ["200 顆（正好一半）", "0 顆（全部衰變完）", "100 顆（四分之一）", "不一定，可能全剩"],
          correct: 0,
          explain: "半衰期是「統計平均」：每一顆原子何時衰變完全隨機，但大量原子整體會以指數衰減，每個 T½ 大約剩一半。"
        }
      },
      {
        t: 9.6,
        title: "三個半衰期過去了",
        hint: "剩下的是原本的 1/8。看曲線：它永遠不會真正歸零——只是越來越接近零。",
        quiz: {
          q: "n 個半衰期後，剩下原本的比例是——",
          choices: ["1/n", "1/2n", "(1/2)ⁿ", "1 − 1/n"],
          correct: 2,
          explain: "每經過一個 T½ 就「再剩一半」，所以是 (1/2)ⁿ。這也是碳-14 定年的計算基礎。"
        }
      }
    ],
    "standing-wave": [
      {
        t: 4.0,
        title: "不動的點（節）與最動的點（腹）",
        hint: "紅點標示的地方永遠不動——那是「節」。兩節正中間振幅最大——那是「腹」。驻波其實是入射波和反射波的疊加。",
        quiz: {
          q: "相鄰兩個「節」之間的距離是波長 λ 的——",
          choices: ["一倍", "一半", "四分之一", "兩倍"],
          correct: 1,
          explain: "駐波的節距是 λ/2。這也是為什麼弦樂器按弦改變「有效長度」就能改變音高：長度決定能駐留的波長。"
        }
      }
    ],
    "beats": [
      {
        t: 5.0,
        title: "聲音「嗡——嗡——」變大了又變小",
        hint: "上面是兩個原始波（頻率接近），下面是疊加結果。看疊加波的「包絡」：一會兒大、一會兒小，這就是拍。",
        quiz: {
          q: "兩個頻率分別 440 Hz 和 443 Hz 的音叉同時響，你會聽到——",
          choices: ["443 Hz 的一個音", "拍頻 3 Hz 的嗡嗡起伏", "完全沒有聲音", "883 Hz"],
          correct: 1,
          explain: "拍頻 = |f₁ − f₂| = 3 Hz：每秒強弱起伏 3 次。樂團調音就是把這個「嗡嗡聲」調到消失（頻率一致）。"
        }
      }
    ],
    "resonance": [
      {
        t: 4.5,
        title: "驅動頻率逼近固有頻率……振幅暴增！",
        hint: "看振幅讀數與曲線：驅動頻率 f 等於系統固有頻率 f₀ 時，小小的推力就能累積出巨大的振幅。",
        quiz: {
          q: "共振（振幅最大）發生在——",
          choices: ["驅動頻率越高越好", "驅動頻率 = 固有頻率", "推力越大越容易", "阻尼越大越容易"],
          correct: 1,
          explain: "當推力的節奏正好匹配系統自己的晃動節奏（f = f₀），每一推都在「順勢加能」，振幅疊加暴增——士兵過橋要便步走就是這個原因。"
        }
      }
    ],
    "collision": [
      {
        t: 0.6,
        title: "碰撞的瞬間：動量交換了",
        hint: "注意碰撞前後兩車的速度讀數。把恢復係數 e 調到 1（彈性）與 0（完全非彈性）各跑一次，看看差別。",
        quiz: {
          q: "完全非彈性碰撞（兩車黏在一起）之後，系統的——",
          choices: ["動量與動能都守恆", "動量守恆、動能損失最大", "動能守恆、動量改變", "兩者都不守恆"],
          correct: 1,
          explain: "動量永遠守恆（沒有外力）；但黏在一起時「變形與熱」吃掉了動能——這是動能損失最大的碰撞。安全崩潰區設計就是把動能吃掉。"
        }
      }
    ],
    "photoelectric": [
      {
        t: 0.0,
        near: { target: "slider", label: "入射光頻率 f (×10¹⁴ Hz)", op: "cross", value: 5.56 },
        title: "調頻率：低於門檻再多光也沒用",
        hint: "把頻率慢慢調高。頻率低於門檻 f₀ 時，不論光多強都沒有電子飛出；一跨過 f₀，電子立刻出現。",
        quiz: {
          q: "提高光的「強度」但頻率仍低於門檻，光電流會——",
          choices: ["出現（光夠強就行）", "仍然是零", "變成負的", "先出現後消失"],
          correct: 1,
          explain: "光子能量 E = hf 只由頻率決定。頻率不足＝每顆光子都「推不動」電子，堆再多顆也沒用——這正是愛因斯坦解釋光量子的關鍵。"
        }
      }
    ],
    "bohr": [
      {
        t: 0.0,
        near: { target: "slider", label: "終能階 n_f", op: "cross", value: 2.5 },
        title: "跳到不同層，光的顏色不一樣！",
        hint: "電子跳回 n=1 是紫外（萊曼系）、跳回 n=2 是可見光（巴耳末系）。看底部光譜條亮起的譜線位置。",
        quiz: {
          q: "電子從高能階跳回 n=2 時發出的光屬於——",
          choices: ["萊曼系（紫外）", "巴耳末系（可見光）", "帕申系（紅外）", "X 射線"],
          correct: 1,
          explain: "跳回 n=2 的能量差落在可見光範圍，是巴耳末系——氫原子在可見光的四條譜線就是這樣來的。"
        }
      }
    ],
    "wave-types": [
      {
        t: 3.5,
        title: "橫波 vs 縱波：介質怎麼動？",
        hint: "橫波：介質上下振動、波往右跑。縱波：介質左右來回、形成疏密。看箭頭方向跟波前進方向的關係。",
        quiz: {
          q: "聲音在空氣中傳播是——",
          choices: ["橫波（上下振動）", "縱波（疏密交替）", "既是橫波也是縱波", "不是波"],
          correct: 1,
          explain: "聲波靠空氣「疏→密→疏」推擠前進，介質振動方向與傳播方向平行，是縱波。繩波則是橫波。"
        }
      }
    ],
    "escape-speed": [
      {
        t: 5.0,
        title: "跨過 11.186 km/s：地球抓不住你了",
        hint: "把天體質量調大或半徑調小，看逃逸速度怎麼變。地球的 11.186 km/s 是怎麼來的？用能量守恆算：½mv² = GMm/R。",
        quiz: {
          q: "某行星質量與地球相同、半徑只有地球一半，它的逃逸速度是地球的——",
          choices: ["一半", "√2 倍", "兩倍", "一樣"],
          correct: 1,
          explain: "v = √(2GM/R)：R 減半 → v 變 √2 倍 ≈ 15.8 km/s。密度越高的天體，逃逸速度越嚇人——黑洞就是 R 壓到極小的極限。"
        }
      }
    ],
    "superposition": [
      {
        t: 4.0,
        title: "兩波相遇：疊加後又各自離開",
        hint: "看兩波交會的瞬間：同相疊加變更高（建設性干涉），反相抵消變平（破壞性干涉）——然後兩個波「完好如初」地繼續前進。",
        quiz: {
          q: "兩個反相（一峰一谷）的波相遇疊加的那一刻——",
          choices: ["互相抵消，波消失了", "變成兩倍振幅", "反彈回去", "變成聲音"],
          correct: 0,
          explain: "破壞性干涉讓瞬時位移為零，但兩個波並沒有消失——它們「穿過彼此」後繼續原樣前進。這是波獨有的性質，粒子相遇就會撞開。"
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
    card.setAttribute("aria-label", "觀察點");

    const kicker = document.createElement("span");
    kicker.className = "sim-observe-kicker";
    kicker.textContent = "觀 察 點";
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
          verdict.textContent = correct ? "答對了！" : "再想想——";
          const exp = document.createElement("span");
          exp.textContent = quiz.explain;
          result.appendChild(verdict);
          result.appendChild(exp);
          const cont = document.createElement("button");
          cont.type = "button";
          cont.className = "sim-observe-continue";
          cont.textContent = "繼續播放 ▶";
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
    skip.textContent = "不問了，直接繼續 ▶";
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
        badge.innerHTML = '<span class="sim-observe-badge-dot"></span>本實驗含 ' + points.length +
          ' 個觀察點：播放到關鍵時刻會自動暫停並提問。';
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
      // 暫停所有迴圈
      const wasRunning = context.loops.some(l => l.running);
      context.loops.forEach(l => { try { l.stop(); } catch (e) {} });
      busy = true;
      const card = buildCard(p, function onResume() {
        busy = false;
        if (wasRunning) context.loops.forEach(l => { try { l.start(); } catch (e) {} });
      });
      document.body.appendChild(card);
    }
  });
})();
