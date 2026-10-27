# Sprint 4：限定 Arduino Blink 契約 v0.3

日期：2026-10-27（Asia/Taipei）。使用者要求加入程式碼功能；本版沿用既有 GPIO23、220 Ω、單顆 LED 與 GitHub Pages 試用版，沒有加入任意 C/C++ 編譯、韌體燒錄或硬體連線。

本文既有語法與 GPIO23 限制描述「LED 閃爍」課；新增按鈕專題的 INPUT_PULLUP、digitalRead、if／else、區塊作用域及 Worker 輸入契約詳見 [按鈕課程](button-lesson.md)。兩課都從空架構開始，不提供完整答案。

## 操作與練習

網址 `#code` 或上方「程式練習」進入。預設只有 setup／loop 架構與中文註解，完整 Blink 解法須主動展開「查看標準答案」，不提供直接覆蓋編輯器的載入按鈕。先完成接線（可按「載入接線範例」），再自行編寫程式並按「執行」。練習目標與可展開的概念提示不直接填入答案；可停止後修改程式，再重新執行。單獨執行程式不會自動修復接線，斷路／反接時 GPIO 訊號可運作，但 LED 保持熄滅並顯示接線診斷。

- 執行：建立全新 Worker、解析原始碼，重設虛擬時間與變數，setup 執行一次，再重複 loop。
- 暫停：停止 Worker 排程，凍結畫面上的時間、GPIO 與 LED；「繼續」沿現有執行位置續跑，不重做 setup。
- 停止：終止 Worker，保留已顯示時間與最近訊號紀錄，GPIO 回 INPUT/LOW、LED 熄滅；解除編輯鎖定。
- 重設：終止 Worker，時間歸零、清除診斷及紀錄、GPIO 回 INPUT/LOW；保留編輯器文字與接線。
- 重建架構：停止狀態才可用；確認清除目前程式後，只恢復基本架構，接線不變。取消則保留文字。
- 離開程式分頁會停止執行；回來為 idle。執行與暫停時不能修改程式，避免續跑與文字不一致。
- 程式與接線只存目前頁面記憶體；重新整理回預設程式並清空接線，不宣稱跨裝置同步。

## 凍結 grammar

```text
program     := declaration* function function EOF
function    := "void" ("setup" | "loop") "(" ")" "{" statement* "}"
statement   := declaration
             | "pinMode" "(" expression "," "OUTPUT" ")" ";"
             | "digitalWrite" "(" expression "," ("HIGH" | "LOW") ")" ";"
             | "delay" "(" expression ")" ";"
declaration := "int" identifier "=" expression ";"
expression  := signed_decimal_integer | identifier
```

setup 與 loop 各恰好一次，定義先後可互換；全域宣告只能放在兩個函式之前。支援 ASCII 識別字、空白、換行、`//` 與 `/* */` 註解。每個陳述需分號；允許同一行多個簡單陳述。整數是十進位 32 位元有號範圍。

變數必須有初始值，可引用先前可見的變數；同一作用域禁止重複宣告，禁止自我初始化。全域變數執行一次；setup／loop 各有自己的局部作用域，loop 局部宣告每輪重建，不互相洩漏。沒有重新賦值或算式。

未列出的語法一律拒絕，包括 const、INPUT、條件、for/while、遞迴、自訂函式、陣列、指標、字串、標頭／巨集／函式庫、Serial、PWM、analogRead、網路及任意 JavaScript。HIGH/LOW 與 OUTPUT 必須使用固定常數，不能以數字或變數替代。

## 執行與安全邊界

原始碼只在模組 Worker 中進行 lexer → 受限 AST → 解譯，不使用 eval、Function、動態程式執行或遠端編譯服務。React 只接收結構化快照／診斷，Three.js 只根據驗證後的接線與程式輸出呈現 LED。

- 只支援本課 GPIO23；未知或未引出腳位、輸入專用、Flash 保留腳有專屬診斷；其他 GPIO 提示尚未接入模擬。
- digitalWrite 之前必須先 pinMode(23, OUTPUT)；錯誤一律停止並將輸出降為 INPUT/LOW。
- delay 接受 0..60,000 整數毫秒；單輪 loop 必須有正值 delay，空 loop、零延遲忙迴圈會停止並說明。
- 上限：12,000 字元、400 行、4,000 tokens、256 陳述、每次推進 500 操作、單次推進 20 ms 執行預算、每次執行總計 100,000 操作、24 小時虛擬時間。
- Worker 每次排程推進 50 ms 虛擬時間；數位寫入的紀錄使用精確事件時間，不以 UI 更新時刻冒充。背景分頁／忙碌機器可使牆鐘時間較慢，不追補成大量突發操作。
- 訊號紀錄最多 8 筆；UI 行號最多 401 個，避免極端輸入產生大量 DOM。診斷訊息最多 500 字元並可換行。
- 執行器啟動 5 秒無回應會終止；停止／重設／離開分頁會直接 terminate，元件卸載也會清理 Worker。
- Worker 身分與命令 revision 防止舊執行／暫停前的快照覆蓋新狀態；錯誤仍會結束同一 Worker，不能被暫停競爭隱藏。

## 介面與型別

`Program`／`Statement`／`Expression` 是白名單 AST；`ProgramError` 保存訊息與行列。`ProgramRuntime.advanceTo` 提供可測的虛擬時間核心；`ProgramSnapshot` 包含時鐘、OUTPUT、HIGH/LOW、目前行、loop 次數及最近 trace。

`WorkerCommand` 為 start/pause/resume；`WorkerEvent` 為快照或診斷。主執行緒 hook 管理建立、終止與狀態，停止及重設不依賴 Worker 忙碌時處理命令。原接線 reducer 與程式輸出分開；程式分頁使用 Worker 的有效輸出，手動 HIGH/LOW 不與程式同時爭用。

編輯器採 CodeMirror 6，於程式分頁按需載入，支援 C++ 語法上色、行號、縮排、括號配對、復原／重做、目前行、錯誤行與跳至錯誤位置。輸入名稱自動顯示本課白名單函式／常數及目前作用域已宣告變數；Ctrl＋Space 開啟、Enter 接受、方向鍵選擇、Esc 關閉，片段內 Tab 跳參數。函式呼叫位置顯示參數提示。註解內不補全，不建議其他函式庫或不支援 API。Tab 可縮排；先按 Escape 再按 Tab 可離開編輯區（CodeMirror 鍵盤退出機制）。補全僅插入單個陳述，不生成完整解答，也不是 AI 任意程式生成。虛擬時鐘不以 aria-live 每 50 ms 播報，僅狀態與錯誤有適當提示。

## 驗證與限制

36 項 Node 測試通過（原板型／電路 18 項＋語法／虛擬執行 18 項）。涵蓋精確 0/1000/2000/3000 ms Blink、變數與作用域、註解、非法語法與參數、錯誤行列、腳位限制、未設 OUTPUT、delay 範圍、無 delay、預算、時間、記錄容量及動態 JavaScript 拒絕。

程式分頁 17 項 Playwright 檢查通過：Blink 亮滅、暫停凍結、續跑、停止、重設、改 delay、各類錯誤、定位、長 delay 取消、快速重啟舊訊息抑制、離頁停止、斷路、390/320px 排版、console、Worker 不可用提示。原 LED 接線 18 項及接腳探索 14 項流程也通過。1440×1080 與 390×844 截圖已檢視；標題、導覽、灰白／綠色配色、原生編輯器、控制列、診斷、端點與窄畫面延續既有系統。保留既有簡化板模型與正確接腳資料，未照搬草圖不正確的外觀／接腳文字。

這是受限教學解譯器，不是完整 Arduino 編譯器或 ESP32 CPU 模擬。Acer 實機效能與真實觸控板仍待人工操作確認；不可把雲端軟體 WebGL 視為已完成該項驗收。

## v0.2 練習編輯器驗證

46 項 Node 測試通過，包含新增空架構、白名單片段可解析、變數補全排除註解與其他函式區域。Playwright 驗證空架構、Ctrl＋Space、Enter、Tab 參數、自動建議、參數提示、註解不補全、變數、復原／重做、括號／縮排、實際 Worker 執行與鎖定、診斷定位、重建確認、320/390px 及無例外。Browser plugin not available，採 Chromium 軟體 WebGL；未宣稱為真實 Acer 效能測試。先前 v0.1 的 textarea 與預載 Blink 紀錄為歷史行為，現已取代。

## 主動查看標準答案（2026-10-27）

依使用者最新要求，兩組專題在練習目標下新增預設收合的標準答案，包含完整程式與概念說明。這更新了先前「只提供概念提示」的決策；空架構仍是預設，不自動載入／執行解答。標準答案是一種符合白名單的參考解法，不代表其他有效寫法不正確。

Blink 使用 HIGH／LOW 各 1000 ms；按鈕使用 GPIO18 INPUT_PULLUP、GPIO23 OUTPUT、每圈 int 讀值、if／else 與分支後 delay(50)。solutions.ts 是顯示程式與測試的共同來源，兩份程式以同一解析器／執行器驗證。複製成功顯示提示；剪貼簿 API 不可用或被拒絕時，聚焦並選取唯讀程式區，提示手動複製，不覆蓋學員程式。瀏覽器選取可能省略最後換行，不影響程式語意。切換課程後答案回到收合狀態。

62 項單元測試及瀏覽器檢查包含預設隱藏、正確課程、複製／失敗降級、編輯器／場景實例保留、直接執行實際顯示的兩份答案、暫停時間／接線不變、320/390px 與無例外。Browser plugin not available，使用 Playwright／Chromium 軟體 WebGL；不宣稱為實機效能測試。

## 第三課多輸出擴充

雙 LED 課使用與閃爍課相同的語法，僅額外允許 GPIO22 OUTPUT。執行器以 outputs 記錄各 GPIO 模式／電位，trace 記錄 gpio，仍保留 GPIO23 的相容欄位。每腳先設 OUTPUT、錯誤／停止清除全部輸出、兩課舊邊界與所有預算保持。第三課標準答案與精確交替時間納入測試，總數 72 項。見 dual-led-lesson.md。
