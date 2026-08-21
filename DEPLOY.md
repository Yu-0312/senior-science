# 部署

正式站在 **Vercel**。GitHub Pages 已停用。

## 授權頁為什麼叫 `licensing.html`

**不要把它改回 `license.html`。**

GitHub 會掃描 repo 根目錄，凡是檔名為 `license` / `licence` / `copying`
且副檔名是 `.md`、`.txt`、`.html` 的檔案，一律當成「授權檔」。
這頁原本叫 `license.html`，於是它和真正的 `LICENSE.md` 同時被認成授權檔，
repo 首頁側邊欄就出現了 License 與 License-2 兩個分頁。

改名成 `licensing.html` 之後就不再符合那個規則（比對要求 `licen[sc]e`
後面直接接副檔名或結尾）。`vercel.json` 有一條 308 redirect 把舊網址
`/license.html` 導到新的，舊連結與既有的搜尋結果不會斷。

## 為什麼快取設定長這樣

`vercel.json` 把資源分成兩類，因為它們的更新方式完全不同：

| 資源 | 快取 | 理由 |
|---|---|---|
| `sw.js` | 不快取 | Service Worker 自己就是負責快取的人。它若被快取住，新版永遠裝不上去，使用者會卡在舊版本而且沒有任何辦法自救。 |
| `*.html`、`/` | 不快取 | 每次都要拿到最新的，否則改了東西重新整理仍是舊畫面。 |
| `js/`、`css/` | 一年、immutable | 所有引用都帶 `?v=<build>`，版本一換網址就換，等於天然的快取破壞。安全的前提是**每次改動都要 bump 版本號**。 |
| `icons/` | 一週 | 圖示不帶版本號，所以不能設成 immutable。 |

**這裡有一條隱含的規則：改了 `js/` 或 `css/` 就一定要更新版本號。**
版本號同時寫在 `js/site-config.js` 與 `sw.js`，`build-consistency` 測試會擋住兩邊不一致的情況。

## 正式網址怎麼決定

`tools/build-static.js` 的 `resolveSiteUrl()` 依序找：

1. `SITE_URL` 環境變數 —— 接自訂網域時在 Vercel 後台設一個變數就好，不必改程式
2. `VERCEL_PROJECT_PRODUCTION_URL` —— Vercel 自動注入的正式站網址
3. `js/site-config.js` 的 `siteUrl` —— 本機建置的預設值

用 `VERCEL_PROJECT_PRODUCTION_URL` 而不是 `VERCEL_URL` 是刻意的：
`VERCEL_URL` 每次部署都不一樣，預覽部署會把 canonical 指向那個一次性網址，
等於每推一次就替搜尋引擎多產生一份重複內容。

## 第一次上線

1. 到 <https://vercel.com/new>，用 GitHub 帳號登入
2. 匯入 `Yu-0312/senior-science`
3. Framework Preset 選 **Other**；建置指令與輸出目錄 `vercel.json` 已經寫好，不要在網頁上另外覆寫
4. Deploy

之後每次 push 到 `main` 就會自動部署。

## 接自訂網域

1. Vercel 專案 → Settings → Domains → 加入網域，照指示設 DNS
2. Settings → Environment Variables → 新增 `SITE_URL`，值填 `https://你的網域/`（**結尾要有斜線**）
3. 重新部署一次，canonical 與 sitemap 才會換過去

## 開放搜尋引擎收錄

合作試用結束後：把 `js/site-config.js` 的 `accessGate` 改成 `false`，
更新版本號，重新部署。密碼閘門與 `noindex` 會同時解除，
`robots.txt` 與 `sitemap.xml` 在建置時一併重新產生。

## 發佈前

```bash
node tools/tests/run-all.js
```

測試全綠不代表畫面是對的。這個專案至今每一個嚴重的顯示問題都是靠截圖發現的，
**發佈前請實際打開瀏覽器看過**，深色與淺色主題各看一次。
