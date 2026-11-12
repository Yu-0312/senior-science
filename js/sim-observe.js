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
        hint: "盯著環頂。h = 2.5R 時小球剛好貼著軌道通過，注意它在環頂的速度還剩多少。",
        quiz: {
          q: "小球剛好在環頂不脫軌的條件，是釋放高度 h 至少要等於多少 R？",
          choices: ["2R", "2.5R", "3R", "4R"],
          correct: 1,
          explain: "h ≥ 2.5R 才過得去。h = 2R 的能量只夠爬到環頂的高度（速率為零），但在環頂至少要有 √(gR) 的速率才能貼著軌道轉，所以球會在半路脫軌。爬得上去和過得去是兩個條件。"
        }
      }
    ],
    "doppler": [
      {
        t: 4.5,
        title: "波前開始擠在一起了",
        hint: "波源在動，它前方的波被「壓縮」、後方被「拉開」。看波前圓弧的間距：前方密、後方疏。",
        quiz: {
          q: "波源朝你過來時，聽到的聲音會怎樣？",
          choices: ["變低沉", "變高亢", "完全不變", "先高後低"],
          correct: 1,
          explain: "波源前方的波長被壓短、頻率變高，所以靠近時聽起來比較高；經過之後變成遠離，音調一下子降下來。救護車從身邊開過去時就是這樣。"
        }
      },
      {
        t: 0.0,
        near: { target: "slider", label: "音源速度 vₛ", op: "cross", value: 340 },
        title: "馬赫錐出現了",
        hint: "速度超過 340 m/s 之後，波前來不及散開，疊成一個錐面。注意：波源前方在它經過之前是完全安靜的。",
        quiz: {
          q: "超音速飛機以兩倍音速飛來，你站在它的航線正下方。它在抵達之前你聽得到引擎聲嗎？",
          choices: ["聽得到，只是很小聲", "完全聽不到", "聽得到回音", "要看天氣"],
          correct: 1,
          explain: "超音速時，聲波都落在飛機後面的錐面裡。錐面還沒掃到你之前什麼都聽不到；飛機過去之後，才會聽到很大聲的音爆。"
        }
      }
    ],
    "double-slit": [
      {
        t: 6.0,
        title: "前 20 顆光子完全隨機",
        hint: "每個亮點就是一顆光子。單顆光子會落在哪裡沒辦法預測，但點一多，分布就慢慢出來了。",
        quiz: {
          q: "光源一次只發一顆光子，螢幕上的亮點會怎麼分布？",
          choices: ["只落在兩條亮帶上", "完全均勻散開", "隨機累積，逐漸浮現干涉條紋", "全部落在中央"],
          correct: 2,
          explain: "單顆光子的落點是隨機的，但落在哪裡的機率由波動決定，累積幾百顆之後就排出干涉條紋。一顆一顆打，卻排出波的圖樣，這是量子最違反直覺的地方。"
        }
      },
      {
        t: 13.0,
        title: "條紋出現了。現在在縫上裝偵測器……",
        hint: "偵測器一打開，就知道每顆光子走哪條縫，條紋也馬上消失。量測路徑這件事本身就會改變結果。",
        quiz: {
          q: "在雙縫後面裝偵測器、確認每顆光子走哪條縫之後，螢幕上會看到什麼？",
          choices: ["更清晰的干涉條紋", "兩條亮帶（像子彈一樣）", "完全沒有亮點", "條紋變寬"],
          correct: 1,
          explain: "一拿到路徑資訊，干涉就消失了，光子表現得像顆粒，只堆在兩條亮帶上。互補原理說的就是這件事：波動性和粒子性不會在同一個實驗裡同時出現。"
        }
      }
    ],
    "induction": [
      {
        t: 3.2,
        title: "磁鐵停在正中央：磁通量最大，電動勢卻是零",
        hint: "同時看 Φ（磁通量）和 ε（電動勢）兩個讀數。磁鐵停在最裡面時 Φ 最大，但那時 Φ 的「變化率」是零。",
        quiz: {
          q: "磁鐵插到線圈正中央停住時，感應電動勢是多少？",
          choices: ["最大（因為磁通量最大）", "零（因為磁通量不再變化）", "等於磁通量", "方向反轉"],
          correct: 1,
          explain: "法拉第定律 ε = −ΔΦ/Δt：電動勢看的是磁通量的變化率，不是磁通量有多大。磁鐵停住時 Φ 最大但 ΔΦ = 0，所以 ε = 0。磁通量要有變化才會發電。"
        }
      }
    ],
    "gas": [
      {
        t: 5.0,
        title: "壓力是分子「撞」出來的",
        hint: "左邊的活塞在抖？那是分子一顆顆撞上去、動量變化累積出來的。把溫度調高，看撞擊變得多頻繁。",
        quiz: {
          q: "體積不變、溫度升高時，壓力變大的直接原因是什麼？",
          choices: ["分子變多了", "每顆分子撞得更用力、更頻繁", "分子變大了", "分子停止運動"],
          correct: 1,
          explain: "溫度升高 → 分子平均動能變大 → 撞得更頻繁、每次傳的動量也更大 → 壓力上升。氣體壓力就是大量分子撞擊器壁的平均效果。"
        }
      }
    ],
    "ticker-tape": [
      {
        t: 2.4,
        title: "每個點都是當下打出來的",
        hint: "看紙帶：計時器每 1/60 秒打一個點。小車跑得快，點距就寬；跑得慢，點距就窄。點距就是速度的紀錄。",
        quiz: {
          q: "打點計時器每 1/60 秒打一點。紙帶上的點距越來越寬，表示小車在做什麼？",
          choices: ["等速前進", "加速中", "減速中", "靜止"],
          correct: 1,
          explain: "相鄰兩點的時間間隔固定，點距越來越寬，就是同樣時間內走得越來越遠，表示速度在變快。"
        }
      }
    ],
    "chase-and-meet": [
      {
        t: 4.0,
        title: "注意「速度相等」的那一刻",
        hint: "看 v–t 圖：兩條線交點就是後車速度等於前車的瞬間。那一刻之前距離在縮小，之後呢？看 Δx–t 圖的極值。",
        quiz: {
          q: "後車比前車快，一直在追。兩車速度相等的那一刻，兩車的距離會是？",
          choices: ["最小值（還沒追上就永遠追不上了）", "最大值", "剛好等於零", "無法判斷"],
          correct: 0,
          explain: "速度相等之前，後車一直在縮短距離；相等之後換前車拉開，所以那一刻距離最小。如果那時還沒追上，之後就追不上了。"
        }
      }
    ],
    "lens": [
      {
        t: 0.0,
        near: { target: "slider", label: "物距 u", op: "cross", value: 15 },
        title: "物距跨過焦距：實像變成虛像",
        hint: "把蠟燭從遠處慢慢移近透鏡。一跨過焦距 f，屏上的實像就消失，變成在物體同側的放大虛像（成像公式算出的 q 變成負的）。",
        quiz: {
          q: "凸透鏡成像時，蠟燭移到焦距以內，屏上會看到什麼？",
          choices: ["出現倒立縮小實像", "沒有像（什麼都沒有）", "接收不到實像，但透過透鏡看得到放大虛像", "出現正立實像"],
          correct: 2,
          explain: "p < f 時，1/f = 1/p + 1/q 算出的 q 是負的，表示像在物體同一側，是正立放大的虛像，也就是放大鏡。屏上接不到，要用眼睛透過透鏡看。"
        }
      }
    ],
    "projectile": [
      {
        t: 3.4,
        title: "45° 是真空中的最遠角度",
        hint: "同樣的速度下，比較 45° 和其他角度的落點。再打開「空氣阻力」試一次，最遠的角度還是 45° 嗎？",
        quiz: {
          q: "有空氣阻力時，射得最遠的發射角會怎麼變？",
          choices: ["仍為 45°", "大於 45°", "小於 45°", "與角度無關"],
          correct: 2,
          explain: "空氣阻力會一路消耗水平速度，飛得越久損失越多，所以角度低一點、飛行時間短一點反而比較遠。最遠角度降到大約 40°，而且這時輕的和重的物體結果就不一樣了。"
        }
      }
    ],
    "pendulum": [
      {
        t: 6.0,
        title: "自己量：擺的角度大小影響週期嗎？",
        hint: "看碼錶和週期讀數。振幅從 30° 改成 10°，週期幾乎不變；擺長減半，週期馬上變短。",
        quiz: {
          q: "單擺的週期 T 由什麼決定？（小角度近似）",
          choices: ["振幅越大 T 越大", "只由擺長 L 與重力 g 決定", "擺錘質量越大 T 越大", "跟 L、g、m 都有關"],
          correct: 1,
          explain: "T = 2π√(L/g)，小角度時跟振幅、質量都無關。這叫做單擺的等時性，擺鐘就是靠這個計時。"
        }
      }
    ],
    /* ---------------- 新增：12 個抽象／關鍵時刻實驗 ---------------- */
    "halflife": [
      {
        t: 2.6,
        title: "第一個半衰期：正好一半衰變了嗎？",
        hint: "看方格裡剩下的黃格數和曲線上的點。平均來說會剩一半，但每次擲骰都有一點起伏，這就是衰變的隨機性。",
        quiz: {
          q: "經過一個半衰期 T½ 後，原本 400 顆原子大約剩幾顆？",
          choices: ["200 顆（正好一半）", "0 顆（全部衰變完）", "100 顆（四分之一）", "不一定，可能全剩"],
          correct: 0,
          explain: "半衰期是統計上的平均：單一顆原子什麼時候衰變完全隨機，但很多顆放在一起會照指數衰減，每過一個 T½ 大約剩一半。"
        }
      },
      {
        t: 6.2,
        title: "兩個半衰期過去了",
        hint: "剩下原本的 1/4。看曲線：它會越來越接近零，但不會剛好碰到零。",
        quiz: {
          q: "經過 n 個半衰期，剩下原本的多少？",
          choices: ["1/n", "1/2n", "(1/2)ⁿ", "1 − 1/n"],
          correct: 2,
          explain: "每過一個 T½ 就再剩一半，所以是 (1/2)ⁿ。碳-14 定年就是用這個算的。"
        }
      }
    ],
    "standing-wave": [
      {
        t: 4.0,
        title: "不動的點（節）與最動的點（腹）",
        hint: "紅點標的地方一直不動，那是節；兩個節的正中間振幅最大，那是腹。駐波是入射波和反射波疊在一起的結果。",
        quiz: {
          q: "相鄰兩個節的距離是波長 λ 的幾倍？",
          choices: ["一倍", "一半", "四分之一", "兩倍"],
          correct: 1,
          explain: "相鄰兩節相距 λ/2。弦樂器按弦會改變振動的有效長度，能形成的駐波波長跟著變，音高也就變了。"
        }
      }
    ],
    "beats": [
      {
        t: 5.0,
        title: "聲音「嗡～嗡～」一下大一下小",
        hint: "上面是兩個頻率接近的原始波，下面是疊加後的結果。疊加波的外框（包絡）一下大一下小，這叫做拍。",
        quiz: {
          q: "440 Hz 和 443 Hz 的兩支音叉同時響，會聽到什麼？",
          choices: ["443 Hz 的一個音", "拍頻 3 Hz 的嗡嗡起伏", "完全沒有聲音", "883 Hz"],
          correct: 1,
          explain: "拍頻 = |f₁ − f₂| = 3 Hz，每秒強弱起伏 3 次。樂團調音時就是把這個嗡嗡聲調到消失，那時兩個頻率就一樣了。"
        }
      }
    ],
    "resonance": [
      {
        t: 4.5,
        title: "驅動頻率接近固有頻率，振幅變得很大",
        hint: "看振幅讀數和曲線：驅動頻率 f 等於系統的固有頻率 f₀ 時，很小的推力也能累積出很大的振幅。",
        quiz: {
          q: "共振（振幅最大）發生在什麼時候？",
          choices: ["驅動頻率越高越好", "驅動頻率 = 固有頻率", "推力越大越容易", "阻尼越大越容易"],
          correct: 1,
          explain: "推的節奏跟系統自己晃動的節奏一樣（f = f₀）時，每一推都順著運動方向加能量，振幅就越疊越大。軍隊過橋要改成便步走，就是怕整齊的步伐引起橋的共振。"
        }
      }
    ],
    "collision": [
      {
        t: 1.2,
        title: "碰撞的瞬間：動量交換了",
        hint: "注意碰撞前後兩車的速度讀數。把恢復係數 e 調到 1（彈性）與 0（完全非彈性）各跑一次，看看差別。",
        quiz: {
          q: "完全非彈性碰撞（兩車黏在一起）之後，系統的動量和動能會怎樣？",
          choices: ["動量與動能都守恆", "動量守恆、動能損失最大", "動能守恆、動量改變", "兩者都不守恆"],
          correct: 1,
          explain: "沒有外力時動量一定守恆；但黏在一起時，有一部分動能變成形變和熱，這是動能損失最多的一種碰撞。汽車的潰縮區就是設計來吸收動能的。"
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
          q: "把光調強，但頻率還是低於門檻，光電流會怎樣？",
          choices: ["出現（光夠強就行）", "仍然是零", "變成負的", "先出現後消失"],
          correct: 1,
          explain: "光子能量 E = hf 只看頻率。頻率不夠，每一顆光子的能量都不足以把電子打出來，數量再多也沒用。愛因斯坦就是用這一點說明光是一份一份的。"
        }
      }
    ],
    "wave-types": [
      {
        t: 3.5,
        title: "橫波 vs 縱波：介質怎麼動？",
        hint: "橫波：介質上下振動、波往右跑。縱波：介質左右來回、形成疏密。看箭頭方向跟波前進方向的關係。",
        quiz: {
          q: "聲音在空氣中是哪一種波？",
          choices: ["橫波（上下振動）", "縱波（疏密交替）", "既是橫波也是縱波", "不是波"],
          correct: 1,
          explain: "聲波靠空氣一疏一密地推擠前進，空氣振動的方向跟傳播方向平行，所以是縱波。繩波則是橫波。"
        }
      }
    ],
    "superposition": [
      {
        t: 4.0,
        title: "兩波相遇：疊加後又各自離開",
        hint: "看兩波交會的那一下：同相會疊得更高（建設性干涉），反相會抵消變平（破壞性干涉）。分開之後，兩個波又照原樣繼續前進。",
        quiz: {
          q: "兩個反相（一峰一谷）的波疊在一起的那一刻，會發生什麼事？",
          choices: ["那一瞬間位移抵消成零，之後各自照原樣前進", "兩個波互相抵消，從此消失", "變成兩倍振幅", "反彈回去"],
          correct: 0,
          explain: "破壞性干涉讓那一瞬間的位移變成零，但兩個波都還在，穿過彼此之後照原樣前進。這是波才有的性質，兩顆粒子相遇會撞開。"
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
    kicker.textContent = point.kicker || "觀 察 點";
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
          verdict.textContent = correct ? "答對了。" : "再想想。";
          const exp = document.createElement("span");
          exp.textContent = quiz.explain;
          result.appendChild(verdict);
          result.appendChild(exp);
          const cont = document.createElement("button");
          cont.type = "button";
          cont.className = "sim-observe-continue";
          cont.textContent = point.resumeText || "繼續播放 ▶";
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
    skip.textContent = point.skipText || "不問了，直接繼續 ▶";
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
        badge.innerHTML = '<span class="sim-observe-badge-dot"></span>本實驗含 ' + points.length +
          ' 個觀察點：播放到重要的時刻會自動暫停並提問。';
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
  const QUALITATIVE = /判讀|狀態|判定|模式|提示|結論|是否|檔位|顏色|紀錄|筆數/;
  const TIMELIKE = /時間|經過|^t$|計時|已打點|次數|圈數|計數/;
  function nice(v) {
    if (v == null || !isFinite(v)) return "—";
    const a = Math.abs(v);
    if (a !== 0 && (a >= 1e5 || a < 1e-3)) return v.toExponential(2).replace("e", "×10^").replace("+", "");
    return String(Number(v.toPrecision(3)));
  }
  const withUnit = (v, u) => nice(v) + (u ? " " + u : "");
  const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  const TREND = {
    up: "一直變大", down: "一直變小", updown: "先變大、再變小", downup: "先變小、再變大",
    osc: "反覆變大變小（來回振盪）", flat: "幾乎不變"
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
      up: "一路增加（" + withUnit(y0, r.unit) + " → " + withUnit(y1, r.unit) + "）",
      down: "一路減少（" + withUnit(y0, r.unit) + " → " + withUnit(y1, r.unit) + "）",
      updown: "先升後降（最高約 " + withUnit(tr.hi, r.unit) + "，最後 " + withUnit(y1, r.unit) + "）",
      downup: "先降後升（最低約 " + withUnit(tr.lo, r.unit) + "，最後 " + withUnit(y1, r.unit) + "）",
      osc: "來回振盪（" + withUnit(tr.lo, r.unit) + " ～ " + withUnit(tr.hi, r.unit) + "）"
    }[tr.kind];
    return {
      kicker: "觀 察 點 · 播 放",
      title: "停一下：剛才播放時，你注意到什麼？",
      hint: "回想右邊「量測讀數」裡的「" + r.label + "」，或看畫面上對應的東西怎麼動。",
      resumeText: "繼續播放 ▶",
      quiz: {
        q: "剛才播放的這段時間裡，「" + r.label + "」是怎麼變化的？",
        choices: opts.map(k => TREND[k]),
        correct: opts.indexOf(tr.kind),
        explain: "實驗台實測：「" + r.label + "」的變化是" + how + "。想想看：是什麼讓它這樣變？"
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
        kicker: "觀 察 點 · 播 放",
        title: "停一下：「" + r.label + "」在播放時都沒變",
        hint: "播放期間「" + r.label + "」一直停在 " + withUnit(v, r.unit) + "。畫面在動，但這個量由參數決定，跑的過程中不會變。",
        resumeText: "繼續播放 ▶",
        quiz: {
          q: "那如果把「" + rel.slider.label + "」調大，「" + r.label + "」會？",
          choices: ["變大", "變小", "幾乎不變"],
          correct: rel.direction === "up" ? 0 : 1,
          explain: "實驗台掃描：「" + rel.slider.label + "」從 " + withUnit(rel.slider.min, rel.slider.unit) + " 調到 " + withUnit(rel.slider.max, rel.slider.unit) +
            "，這時「" + r.label + "」由 " + withUnit(rel.first, r.unit) + " 變成 " + withUnit(rel.last, r.unit) + "。等一下自己調調看，驗證這個結果。"
        }
      };
    }
    const opts = shuffle(["flat"].concat(shuffle(["up", "down", "osc"]).slice(0, 3)));
    return {
      kicker: "觀 察 點 · 播 放",
      title: "停一下：播放了一段時間，讀數有變嗎？",
      hint: "看右邊「量測讀數」裡的「" + r.label + "」。畫面在動，不代表每個量都在變。",
      resumeText: "繼續播放 ▶",
      quiz: {
        q: "剛才播放的這段時間裡，「" + r.label + "」是怎麼變化的？",
        choices: opts.map(k => TREND[k]),
        correct: opts.indexOf("flat"),
        explain: "實驗台實測：播放期間「" + r.label + "」一直維持在 " + withUnit(v, r.unit) +
          "。畫面在動，但這個量只看當下的條件，條件沒變它就不會變；想讓它變，就要改參數。下一步試著調一根滑桿。"
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
      kicker: "觀 察 點 · 改 變 參 數",
      title: "你剛改了「" + slider.label + "」",
      hint: "「" + slider.label + "」從 " + withUnit(x0, slider.unit) + (up ? " 調大" : " 調小") + "到 " + withUnit(x1, slider.unit) + "，實驗還在跑。",
      resumeText: "繼續實驗 ▶",
      skipText: "先不回答，繼續實驗 ▶",
      quiz: {
        q: "調整之後，「" + r.label + "」怎麼變了？",
        choices: ["變大", "變小", "幾乎不變"],
        correct: grows ? 0 : 1,
        explain: "實驗台掃描：「" + slider.label + "」從 " + withUnit(rel.slider.min, slider.unit) + " 調到 " + withUnit(rel.slider.max, slider.unit) +
          "，這時「" + r.label + "」由 " + withUnit(rel.first, r.unit) + " 變成 " + withUnit(rel.last, r.unit) + "。現在它是 " + withUnit(r.number, r.unit) + "。"
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
      const NICE = { "1": "」成正比", "-1": "」成反比", "2": "」的平方成正比", "-2": "」的平方成反比", "0.5": "」的平方根成正比", "-0.5": "」的平方根成反比" };
      if (rel && rel.exponent != null) {
        const k = [1, -1, 2, -2, 0.5, -0.5].find(n => Math.abs(rel.exponent - n) < 0.06);
        if (k != null) extra = "把整個範圍掃過一遍會發現：「" + r.label + "」與「" + slider.label + NICE[String(k)] + "。";
      } else if (rel && rel.direction === "peak") {
        extra = "注意：這不是一路單調的關係，「" + r.label + "」在中間會出現極值。";
      }
    }
    return {
      kicker: "觀 察 點 · 改 變 參 數",
      title: "你剛改了「" + slider.label + "」",
      hint: "「" + slider.label + "」從 " + withUnit(x0, slider.unit) + (up ? " 調大" : " 調小") + "到 " + withUnit(x1, slider.unit) + "。其他條件都沒動，這叫控制變因。",
      resumeText: "繼續實驗 ▶",
      skipText: "先不回答，繼續實驗 ▶",
      quiz: {
        q: "調整之後，「" + r.label + "」怎麼變了？",
        choices: ["變大", "變小", "幾乎不變"],
        correct: kind,
        explain: "實驗台實測：「" + r.label + "」從 " + withUnit(a, r.unit) + " 變成 " + withUnit(b, r.unit) + "。" + extra
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
        const when = [stages.indexOf("play") >= 0 ? "播放到一個段落" : "", stages.indexOf("param") >= 0 ? "調整參數之後" : ""].filter(Boolean).join("、或");
        badge.innerHTML = '<span class="sim-observe-badge-dot"></span>本實驗含觀察題：' + when + "，會停下來問你剛才看到什麼。做完再到頁面下方的「完成實驗」總結。";
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
