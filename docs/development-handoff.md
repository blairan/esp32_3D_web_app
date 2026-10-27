# 開發交接：3D MVP 初版

日期：2026-10-27（Asia/Taipei）。目前進度：Sprint 2 的可操作初版已實作，完整 MVP 驗收尚未完成。

## 決策更新 ADR-002

使用者指出前置研究過久，確認滑鼠與筆電觸控板可作主要操作，並明確要求開始開發。調整原 Sprint 1 關卡：已核對的 38 Pin 排列作資料基準，尚未取得的細部尺寸不阻擋**標註清楚的簡化教學模型**；正式機構精度與實機效能驗收留作未完成項。這項變更不降低接腳映射正確性要求，也不將未測結果標成通過。

標準設備：Acer Aspire 5／Windows 11／Chrome。詳細硬體／瀏覽器版號於實機驗收時補登；手機或平板不是開發前提。Sites 建立及發布仍需後續指示。

## 已完成

React + TypeScript + Vite + Three.js 直接整合，獨立的場景、接腳資訊、清單元件與共用資料。沒有 React Three Fiber、後端或資料庫。

38 個獨立實體接腳、選取高亮與面板同步；拖曳／滾輪縮放／固定視角重設；鍵盤清單；簡化模式；WebGL 失敗提示與清單降級；窄螢幕排版。場景重繪按需執行、限制像素比，卸載時釋放幾何、材質、紋理、監聽器與 renderer。

## 驗收證據

- `npm test`：4 個測試、4 通過、0 失敗；對照全部 CSV 映射、別名、GND、保留與輸入專用腳。
- `npm run build`：TypeScript 與 Vite 建置通過；首版主要資產 gzip 約 0.21 MB。Vite 提示單一 bundle 大於 500 kB（原始壓縮前），不是建置失敗。
- Playwright／Chromium 154，軟體 WebGL，1440×1000、1280×720、390×844：38 個按鈕逐一選取、單一選中與面板同步、Tab/Enter、限制提醒、真實 3D 點選 GPIO22、拖曳不改選取、重設圖像一致、wheel 縮放、簡化模式及無橫向溢位皆通過。
- WebGL 初始化不可用與已初始化後 context lost 的降級流程均通過，仍可選取接腳；主操作路徑無未處理 JavaScript 例外。
- 截圖與暫時 QA 腳本放 /tmp，屬當前驗證證據，不納入原始碼或宣稱長期保存。

## 未完成

- 尚未在使用者實體 Acer 上測 FPS、Chrome 實際觸控板、Edge、手機多指手勢；不聲稱全部 MVP 驗收已通過。
- 針距／排距等採示意值，須以官方 dimensions／PCB 文件核對後再提升幾何精度。現行 WROOM-32E 額定文件仍待核查；不套用舊 WROOM-32 的 2.2 V 下限。
- LED 接線與受限 Blink 模擬尚未開始。
- 未推送遠端、未建立 Site、未發布。後續需將程式碼、模型定義與紀錄放入持久版本庫。

下一個最小步驟：讓使用者操作初版，優先確認筆電滑鼠／觸控板手感與接腳資訊，再針對觀察到的問題調整。保持單板 MVP 範圍。


## 接續開發：操作與復原補強

- 新增放大／縮小模型按鈕，可使用滑鼠或 Tab + Enter 操作；縮放沿現有相機方向進行，限制最小／最大距離。
- 修正旋轉慣性尚未結束時按重設，造成相機偏離初始視角的問題。透過 OrbitControls 公開 API 先清除未消耗的位移，再套用初始相機。
- WebGL 失效可按「重試 3D 模型」局部重建，不重新載入整個頁面；保留最新接腳選取與簡化模式。連續三次失效／重試皆通過。
- 清理已失效 context 時不重複請求 context loss，避免警告；補上 favicon，移除瀏覽器的 404 請求。
- 尊重系統減少動態效果設定，停用旋轉慣性。
- `npm run build` 與原有 4 項資料測試通過。Playwright／Chromium 的原有 14 項操作流程檢查通過；本輪另有 9 項檢查（含頁面識別、鍵盤縮放、縮放上限、立即重設、連續復原、啟動失敗後復原、窄螢幕與 console）通過。
- 1280×720、390×844 截圖已檢視；正常流程與 context 復原無 console warning/error 或未處理例外。Browser 插件未提供，因此使用現有 Playwright／Chromium 軟體 WebGL；未當成 Acer 實機效能測試。
- 截圖與臨時驗證腳本仍在 /tmp，不是長期版本資產。尚未推送 GitHub，尚未建立或發布 Site。其餘未完成項維持上節所列。


## GitHub Pages 發布進度

使用者已授權「用 GitHub Pages 發布試用版」。程式、文件及 `.github/workflows/pages.yml` 已成功推送至 `blairan/esp32_3D_web_app` 的 main 分支（首次提交 b67f1fb）。先前各節「尚未推送／未授權發布」為歷史狀態，現在以本節為準。

本地 4 項資料測試與 production build 通過。GitHub Actions 使用 Node 24，執行 npm ci、npm test、npm run build，透過官方 upload-pages-artifact / configure-pages / deploy-pages 發布 dist。保留 Vite 相對資產路徑，未提交 node_modules 或 dist。

阻礙：此執行環境對 api.github.com 與 blairan.github.io 的請求均被代理 403 拒絕；匿名 GitHub Actions 頁面為 404，無法以此判定儲存庫可見性或 workflow 狀態。既有注入的 GH_TOKEN 變數存在，但 API 請求在網路層即遭拒，不要求使用者在對話提供憑證。

已保存環境網路草稿，於原有 Espressif 自訂網域以外新增 api.github.com、blairan.github.io。保存不是套用或發布雲端環境。

下一步：儲存庫 Settings → Pages → Source 選 GitHub Actions；再至 Actions → Publish GitHub Pages → Run workflow（main）。若使用者已完成，確認 deployment 的 page_url 與公開頁面載入，才能宣布試用網址可用。若要由雲端代查部署結果，環境網路草稿也需檢閱、儲存並發布後才能重試管理 API／公開網址。

發布狀態：**程式與工作流程已推送，公開網站是否部署成功尚未確認**。沒有建立 PR，也未改動儲存庫可見性或宣稱 GitHub Pages 已啟用。
