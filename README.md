# ESP32 Interactive Lab

繁體中文 ESP32 接腳探索工具。已實作可操作的 3D MVP 初版，板型為 **ESP32-DevKitC V4／ESP32-WROOM-32E，38 Pin**。

## 開發與驗證

需要 Node.js 22.12+（本環境使用 24）與 npm。

```sh
npm ci
npm run dev
```

```sh
npm test
npm run build
npm run preview
```

`npm run dev` 啟動 Vite 開發伺服器；`npm run preview` 檢查 dist 靜態產物。雲端任務已隔離，直接使用現有 checkout，不需另建 Git worktree。沒有 API key、後端、資料庫或帳號需求；執行時不載入外部模型、字型或 CDN。

## 已有功能

- 真正的 Three.js 簡化幾何模型；滑鼠拖曳旋轉、右鍵或 Shift＋拖曳平移、滾輪／筆電觸控板捲動縮放、重設固定視角；亦提供可由鍵盤操作的放大／縮小按鈕。
- 38 個獨立接腳的 3D 點選、高亮、資訊面板及同步清單。
- 清單可用 Tab 與 Enter／Space 操作，提供可見焦點與跳至清單連結。
- 電源、EN、3 個 GND、輸入專用、啟動／UART／JTAG 及 6 個 flash 保留腳分別說明。
- 簡化模式、響應式版面；WebGL 初始化失敗或 context lost 時，接腳清單與資訊仍可使用，並可只重試 3D 模型而保留選取與簡化模式。

## 資料與模型範圍

`src/pins.json` 從已核對的 `docs/esp32-devkitc-v4-pins.csv` 建立；3D、清單與面板共用此資料。資料測試會對照 CSV 全部 38 筆並檢查特殊腳分類。

**外觀、針距、排距與細部元件是教學示意，不是製造 CAD。** 正式機構 PDF 與現行模組額定尚待補核；不將示意座標宣稱為已量測。原始 30 Pin DOIT 研究保留作歷史，現行定義依 v0.2 決策。

已加入 LED 接線教學：點選端點接線、刪線、固定 220 Ω 電阻與單顆 LED、接線診斷及 HIGH／LOW 亮滅。切換右上方「LED 接線」，或使用網址 `#led` 進入。課程與規則詳見 [LED 教學契約](docs/led-lesson.md)。已加入「程式練習」（網址 `#code`）：限定 Arduino Blink 編輯器、虛擬時鐘、Worker 解譯、執行／暫停／停止／重設與行列錯誤。完整語法與限制見 [程式教學契約](docs/program-lesson.md)。使用者已授權 GitHub Pages 試用版部署；設定與首次啟用方式見 [部署說明](docs/github-pages.md)。Codex Sites 未建立。

## 驗證狀態

36 項資料／電路／程式測試與 TypeScript／Vite production build 通過。已用 Playwright + Chromium（軟體 WebGL）驗證 38 腳選取、真實 3D raycast、拖曳不誤觸、重設、縮放、鍵盤、簡化模式、1280×720 與窄螢幕，以及 WebGL 初始化失敗／context lost 的降級操作。

這不代表 Acer Aspire 5／Windows 11／Chrome 的實機效能驗收通過。實體筆電觸控板、Edge 與手機多指手勢未實測；不需另外購買觸控裝置才可接續。原規劃至少 30 FPS 仍是待實機量測目標。主要建置資產 gzip 約 0.23 MB，低於 5 MB 目標。

來源與變更理由見 `docs/board-decision-v0.2.md`；接續狀態見 `docs/development-handoff.md`。原始碼與文件已推送 GitHub 的 main 分支；目前 GitHub Pages 的啟用與遠端部署成功狀態尚待確認。
