# Design QA

## Source Truth

- Reference image: `/var/folders/_j/tgwn359j6lv2m4lncms30rnw0000gn/T/TemporaryItems/NSIRD_screencaptureui_snSApi/Screenshot 2026-07-24 at 8.17.46 PM.png`
- Secondary visual reference: `https://www.douyin.com/user/MS4wLjABAAAAs19HZ0ecHKqv0HuopcsXbgx1-pPx9b5sDh08LH9AAs0boFwZ5Gpixyub48yU8FfG?from_tab_name=main`
- Implementation: `http://127.0.0.1:4177/#double-slit`
- Source viewport: 2354 x 1482 px
- Extended source set: `/Users/maxwang/Desktop/Screenshot 2026-07-24 at 9.09.50 PM.png` through `/Users/maxwang/Desktop/Screenshot 2026-07-24 at 9.14.35 PM.png`

## Comparison

- Full desktop comparison used the source image and the implementation capture together at 2354 x 1482 px.
- The finished lab preserves the reference's dark, high-density scientific-instrument character while retaining this project's Taiwan curriculum navigation, terminology, and original physical model.
- The double-slit scene now visibly communicates an optical bench: laser housing, support feet, rail graduations, double slit, interference wavefronts, detector screen, bright-stripe preview, photon accumulation, order marks, and a measurement bracket.
- The shared simulation shell is applied by `PhysicsLab.ui.layout()` and `PhysicsLab.draw.bg()`, so all 200 experiments receive a consistent visual stage, parameter deck, real-time readout deck, instrument grid, and labelled chart frame.
- The secondary reference informed the cleaner apparatus silhouettes, restrained technical labels, and clear separation of the physical model from its measurement data; no short-video layout or third-party artwork was copied.
- The extended source set informed the new experiment-workbench hierarchy: clear instrument title, separated visual/control/data regions, structured procedure state, and data-first control tools. The implementation keeps the project’s original dark lab system rather than copying third-party screen composition or artwork.

## Focused QA

- Desktop: no stretched visual panel or unused in-panel vertical space after independent panel sizing.
- Mobile: checked at 390 x 844 px; document scroll width equals viewport width, the canvas is 304 x 164 px, and all three lab panels are present without overlap.
- Interaction: the unique `波長 λ (nm) 增加` control changed the value from 600 to 610 and redrew the live experiment.
- Runtime: browser console reported no errors on the refined double-slit page.
- Subject-stage sampling: checked mechanics, thermal, circuit, and magnetism screens. Each receives the appropriate stage name, calibration rail, colour treatment, and family-specific instrument chrome.
- Shared workbench controls now provide functioning experiment guidance, step-by-step procedure state, focus view, full-screen view, reading export, and primary-canvas capture for all registered experiments.
- Access gate is intentionally scoped as a page-lifetime barrier for a static GitHub Pages site; reloading or opening a new tab requires the password again. It is not represented as server-side access control.
- Curriculum registry: 12 modules, 200 curriculum IDs, and 200 registered simulations; duplicate, missing, and extra-ID checks are all empty. The app now repeats this audit at startup and exposes the result as `window.PhysicsLabAudit` for browser QA.
- Expanded-lab check: `核反應與質能轉換` renders its dedicated micro-observation scene, two live controls, calculated readout, graph, formula, and learning points. One keyboard increment of mass defect changed the model output from `664.59` to `709.37`.
- Responsive recheck: at 390 x 844 px, document scroll width equals the viewport width and the six shared workbench commands wrap into a clear two-column control grid without overlap.
- Runtime recheck: the expanded lab browser console reported no warnings or errors.
- Comprehensive extension check: the 44 fourth-batch labs were each opened through the site's own search and route flow. All 44 rendered their named experiment page, control deck, live readouts, relationship chart, formula, and learning points without a browser runtime error.
- Representative visual check: the `輻射平衡與溫室效應` stage renders a dedicated greenhouse chamber with incoming and outgoing radiation arrows, rather than a reused static image. Mechanics, optics, circuits, and modern physics were likewise sampled with `水火箭與反作用力`, `光纖傳輸與彎曲損耗`, `RLC 串聯共振與相位`, and `陰極射線管與電子比電荷`.

## History

- Added the common experiment-bench hierarchy and responsive layout.
- Added shared canvas calibration grid, corner marks, chart ticks, and denser readout surfaces.
- Elevated double-slit to a flagship optical-bench simulation.
- Added profile-driven stages for all 12 curriculum modules: motion / force / momentum / energy / oscillation use a mechanics rail, orbital topics use an observation field, thermal topics use a bench, waves use a wave guide, optics use an optical rail, circuits use terminals, magnetism uses field coils, and modern physics uses a detector field.
- Added the common guided-workbench command layer and per-page access gate across the complete curriculum.
- Extended the curriculum from the junior-high natural-science bridge through senior-high electives with 44 themed simulations: sensing, simple machines, fluid and thermal phenomena, sound, imaging, household circuits, electromagnetism, and modern-physics instruments.

## 2026-07 淺色主題與可用性修正

### 問題根因

- 淺色主題僅覆寫十餘個變數，其餘表面色寫死為 `rgba(255,255,255,α)`，在白底上等於白疊白，分隔線、面板頭、格線與襯底面全部消失。
- 84 個實驗檔中有 247 處寫死的白色系繪圖色（`#fff`、`#e6edf3`、半透明白），深色台上清楚，淺色台上整片不可見。
- 模組識別色為 Material 300/400 亮色，當作文字放在白底上僅約 1.4:1。
- 列印樣式只改 `body` 的顏色，子元素仍吃深色主題變數，列印結果為白紙淺灰字。

### 對應處置

- 新增語意化表面色階（`--tint-1/2/3`、`--edge-hi`、`--grid-line`、`--scrim`、`--on-accent` 等），兩個主題各自定義。
- 在 `sim-core.js` 加入主題感知墨色層：以 12px 粗網格追蹤背景亮度，繪圖時依背景決定是否翻墨；純算術實作，量測為每影格額外約 0.13 ms。
- 新增 `--m-ink` 系列變數，淺色主題下把模組色壓深 45% 後再當文字色。
- 列印樣式改為整組覆寫變數。
- 授權頁補上主題同步與切換鈕；兩頁都加入樣式表載入前的主題預設腳本，消除深色閃爍。

### 驗證

- 對比檢查腳本：兩主題共 32 組前景／背景組合，加上 12 個模組色的文字用法，全部 ≥ 4.5:1（AA）。
- 墨色層單元測試 15 項全數通過，含「彩色圓點上的白字須保留白色」與「壓暗後色相偏移 < 6°」。
- 全站渲染測試：245 個模擬在深色與淺色主題下各建置並重繪兩次，零例外。
- 實驗檔中 65 種寫死顏色在淺色實驗台上的最差對比由 1.12 提升至 3.00。
- 邏輯測試 21 項全數通過（學習計劃切分、最小平方法、章節檢核觸發條件）。

## 2026-07 對照市面模擬器的功能升級

### 依據

主要依據 PhET Interactive Simulations 公開的《PhET Look and Feel — Underlying Ideas》
（設計準則來自實際的學生訪談），並參考 Physics Aviary 的隨機化實驗題設計。

### 對照後找出的落差與處置

| PhET 準則 | 本站原狀 | 處置 |
| --- | --- | --- |
| 「點擊拖曳是最自然的動作，看起來有用的東西學生都會想去拖」 | 245 個實驗全部只能用滑桿，畫面上沒有任何東西可以碰 | 新增疊圖工具層，可拖曳的碼錶與量角器對全部 245 個實驗生效 |
| 「為鼓勵量化探究應提供尺、碼錶等量測儀器」 | 完全沒有量測工具 | 碼錶量模擬時間（慢動作正確計入）；尺需 `cv.calibrate()` 才提供，已為 6 個有真實長度尺度的實驗校準 |
| 「學生不會自己找到播放／暫停鍵，但看到就會用」 | 只有部分實驗有播放鍵，且藏在指令列 | 獨立的時間控制列放在實驗台正上方，含單步與 0.25×～2× 慢動作 |
| 「模擬啟動時應該幾乎不動，才能鼓勵探索」 | 每個實驗一進場就自動播放 | 在 `loop()` 攔截建置期的 `start()`，改為停在第一格並以 wiggle-me 指向播放鍵 |
| 「play area 裡的文字是干擾」 | canvas 上畫了整句解說 | 4 句純解說移到畫面下方的說明列；圖表標題與座標約定屬圖說本身，保留 |
| 「控制面板的文字一到三個字最有效」 | 面板內有整段 note | 超過 34 字的 note 改為預設收合 |
| 市面標配的 Reset All | 沒有 | 控制項工廠統一登記初始值，一鍵還原全部參數、資料與計時 |
| Physics Aviary 的隨機化實驗題 | 全站皆為選擇題 | 8 個實驗新增隨機化計算題，種子由裝置＋日期決定，含相對容差判定與逐步解法 |

### 實作要點

- 全部透過 `layout()`、`loop()`、控制項工廠這三個共用入口攔截，245 個實驗檔零修改即生效。
- 工具層畫在獨立疊圖畫布上，不介入實驗自己的 `draw()`；未開啟工具時 `pointer-events: none`，完全不影響原本操作。
- 隨機題種子改用 splitmix32：原本的線性同餘產生器對相鄰種子的第一個輸出幾乎相同，量化後會出現「按了換一題卻沒換」。

### 驗證

- 工具層與時間控制互動測試 27 項全數通過（含「進場停在暫停」「重設還原滑桿」「碼錶在 0.25× 下只走 0.25 s」「未校準的實驗不提供尺」）。
- 隨機題目測試 18 項：每題以 400 個種子生成，並用題幹數字獨立重算驗證答案，最大相對誤差 0.59%（來自題幹的四捨五入）。
- 全站渲染測試：245 個模擬在深淺兩主題下各建置並重繪，零例外。
- 對比檢查、墨色層測試、既有邏輯測試全數維持通過。

## 2026-07 學習鷹架：讓學生知道「要看什麼、怎樣算做完」

### 問題

使用者回報「有些實驗單純體驗會不知道意義」。量化後確認：任務導讀與實驗流程只有
8 種依模組族群產生的版本在服務 245 個實驗（同一模組內文字完全相同）、課本銜接以
模組為單位由 20 個實驗共用、237 個實驗的題目仍是同一組樣板，而且**沒有任何一個實驗
會告訴學生「達成什麼算成功」**。滑桿可以拉，但沒有目標也沒有觀察重點。

### 解法：讓模擬自己說出它的物理關係

關鍵觀察是模擬本身就知道答案。每個實驗都有滑桿（自變量）與讀數（應變量），
程式化掃描滑桿並記錄讀數，就能量出真正的關係，不需為 245 個實驗逐一撰寫。

- 以 log–log 迴歸求冪次律指數，r² > 0.995 才敢命名為「成正比／與平方成正比」等。
- 讀數改為同時保留未格式化的原始數值：先前讀四捨五入後的字串，會讓 P ∝ V² 被算成 V^1.93。
- 自變量改用「寫入後回讀的實際值」：滑桿有 step，寫入 475 會被吸附成 480。
- 每掃完一支滑桿就放回原位，否則下一支會在「前一支停在最大值」的狀態下量測。
- 步進器（stepper）與滑桿一併登記，否則只用步進器的實驗（拋體、雙狹縫、光電效應）完全探測不到。

### 避免說出錯誤的結論

探測時其他滑桿停在預設值，若模型在該工作點飽和（浮力實驗中物體已完全沒入，
沒入比例卡在 100%），掃描另一支滑桿會看到「完全沒有變化」而被誤判成物理無關。
因此每個「沒有變化」的組合都會在行程 35% 與 70% 兩個額外工作點複驗，
三個工作點都平坦才承認是不變性，否則降級為「範圍限制而非物理無關」並不出題。
此外會過濾讀數只是回顯滑桿數值的組合，並要求不變性的讀數對其他變因有明顯反應
（>25%），才值得指出「唯獨這一個沒有影響」。

### 建立在探測結果上的三個功能

1. **先預測再操作（POE）**：先問方向，再用真實數據揭曉並附冪次關係。
2. **可驗證的挑戰**：自動產生目標值（非單調時改為求極大值），即時判定並記錄過關。
3. **關係摘要**：列出實測到的關係，真正的不變性排在最前面。

### 驗證

- 對照已知物理 9 項全數通過：T ∝ √L、T ∝ 1/√g、等時性、T ∝ √m、T ∝ 1/√k、
  I ∝ 1/R、I ∝ V、P ∝ V²。
- 探測後滑桿必須完全還原（5 個實驗檢查），避免學生看到的不是設計好的初始狀態。
- 覆蓋率：探測成功 233/245（95%）、產生預測題 230（94%）、產生挑戰 225（92%）。
- 成本：平均每個實驗 4.9 ms（含不變性的兩次複驗）。
- 抽樣人工檢查生成文字：雙狹縫自動得出 Δx ∝ λ、∝ L、∝ 1/d；光電效應得出
  「最大動能與遏止電壓皆不受光強度影響」；拋體偵測到射程在中間角度出現極大值。

final result: passed
