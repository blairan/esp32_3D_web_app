# 站內繁體中文教學 Wiki

2026-10-27。使用者選擇站內繁中教學 Wiki，並授權依既有 Pages 流程實作、驗證及發布。

## 教學與入口

六個固定文章 ID 與 topicArticles 對照保存於 src/wiki/articles.ts：GPIO／電位、LED／限流、setup／loop 課程導讀、pinMode、digitalWrite、delay。每篇包含白話解說、短例子、常見錯誤、思考題、模擬限制及官方來源。沒有完整 Blink 解答；外部官方資料可能包含完整範例與更廣語法，介面有說明，不能直接當作本模擬器支援範圍。

程式練習「查看教學 Wiki」開啟導讀；LED「了解接線原理」開啟接線文章。編輯器的三種函式參數提示及函式補全資訊有「查閱解說」，直接對應文章。常數與 int 補全的延伸資訊導向 GPIO 入門。

## 閱讀與狀態

WikiProvider 保存獨立文章歷史，透過穩定 context callback 開啟。App、編輯器與場景保持原實例；不切換模式、不變更 URL、不改變程式、選取或接線。執行中的 Worker 照常運行；已暫停的虛擬時間不變。動畫或拖曳慣性本身可以自然延續，不是文章開啟造成重設。

原生 modal dialog 於桌面為右側 560px 面板，600px 以下為全螢幕；固定標頭含返回與關閉、內容區獨立捲動。目錄切換與延伸閱讀可返回上篇。標題取得焦點，Tab／Shift+Tab 在面板中循環；Esc 僅關閉 Wiki，不取消尚未完成的接線。關閉後返回原入口；來自會消失的編輯器 tooltip 時返回 editor.contentDOM，保留游標與文字。背景以原生 modal inert 加 body 捲動鎖定處理。

沿用自訂面板背景、文字與主色。Wiki 的程式片段／思考題採淺色底與固定深字，深淺背景皆可閱讀；官方參考連結使用安全的另開分頁。內容隨 Git 提交與網站建置保存，沒有後端、登入、使用者編輯或搜尋。

## 驗證

- 48 項 Node 測試：新增六篇文章、唯一 ID、主題與延伸連結解析、必要教學內容、短例子與官方 HTTPS 來源檢查。
- Playwright／Chromium 軟體 WebGL（Browser plugin not available）：三處入口、三種參數解說、補全資訊、不改文字、六篇與返回、焦點回復、執行不中斷、暫停時間／接線保留、相機視角、深色、Esc 保留待接端點、320／390px、鍵盤循環與無未處理例外。
- 相機截圖比對在 prefers-reduced-motion 下停用拖曳慣性；先確認一般模式移動來自尚未衰減的 OrbitControls pan。靜態比對未改變相機，容許 GPU 合成至多兩個色階誤差。
- 已檢視 1440×1080 桌面及 320／390px 全螢幕閱讀截圖。實際 Acer 裝置、Edge 與手機實體手勢未測。
- 官方文件主站的直接 HTTP 驗證受到此環境代理 403 阻擋，不將外站逐頁可用性標為通過。已經由 GitHub API 確認 Arduino 官方 reference-en 的五個對應函式／結構文件及 docs-content 的 Blink、Digital Pins 原始文件存在，並核對基本教學內容。內部文章無需外站連線即可閱讀。

發布延續 main → GitHub Actions → GitHub Pages，需以本次工作流程與公開新資產確認結果。
