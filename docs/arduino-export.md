# UNO／ESP32 Arduino `.ino` 匯出

2026-10-31。以本頁目前板型、課程與自己寫的程式產生 Arduino IDE 原始程式；不載入標準答案，不改寫草稿、接線或執行狀態。`.json` 練習保存格式維持 v1，與 `.ino` 用途不同。

## 使用

1. 點標題下方「匯出 Arduino 程式（.ino）」。空白 loop、語法錯誤、不支援或無法安全轉換的程式會顯示原程式行列，停用下載。
2. 預覽板型、課程、核心／函式庫版本、逐處修改前後內容及完整實板程式。下載內容與預覽一致，不要求模擬接線完成。
3. 下載如 `lab_uno_r3_blink.ino`，放進同名資料夾 `lab_uno_r3_blink`，用 Arduino IDE 開啟。
4. 安裝指定核心及課程所需函式庫，選板型、USB 連接埠，先驗證，再上傳。ESP32 的開發板管理員額外網址：<https://espressif.github.io/arduino-esp32/package_esp32_index.json>。
5. DHT／OLED 錯誤訊息使用 115200 baud 序列監控視窗。關閉／取消／Esc 返回原入口；手機全螢幕，Tab／Shift+Tab 保持在面板。

瀏覽器沒有編譯使用者程式，下載的是原始程式，不是 `.hex`／`.bin`。沒有編譯後端或直接燒錄。實際接線、電壓、供電與模組規格仍須核對，尤其兩板的邏輯電壓、ADC、Servo、超音波 Echo、I²C 與原生腳位差異。編譯通過不代表硬體測試通過。

## 產生器與限制

- `src/hardware/exportSketch.ts`：以共用白名單 AST、詞法 token 的原始 start/end 位置建立互不重疊的局部編輯。保留名稱、註解及未改動的文字；不對全文做程式字串替換。
- 一般宣告使用 `int32_t`，算式中的數字常數提升為 32 位元，避免 AVR 的 16 位元中間運算。負溫度採向零截斷，負 PWM 步長維持有號。
- 依範圍及賦值關係追蹤 millis() 變數、別名及時間差，使用 `uint32_t` 減法回捲。時間與一般數值／有號值、時間戳與時間差混用時拒絕；直接排序比較時間戳也拒絕，須先相減再比較。無法確定用途的時間算式需拆開或簡化；不猜測使用者意圖。
- 已知 Arduino／核心／函式庫名稱衝突、重複宣告、未知或自身初始化的變數會指出行列。輔助函式、全域及區域變數使用不與原程式名稱重疊的前綴。
- 依實際裝置物件加入標頭。UNO 用 Servo，ESP32 用 ESP32Servo；Wire 隨核心提供。保留所選板型及使用者原生接腳，不做跨板轉接。
- DHT22：首次讀值等初始化滿 2000ms；溫溼度共用 2000ms 快取。先檢查兩個浮點讀值的 NaN，再轉 int32_t。未執行 begin 或 NaN 會輸出原因並停止。
- OLED：保留原 begin 參數與註解並檢查其回傳結果。失敗時停止；已成功初始化的 OLED 可在 DHT 失敗時清空。這不等於檢測所有實體 I²C 接線故障。
- 感測／初始化失敗時，關閉本課警示 LED（DHT／整合課：UNO D10、ESP32 GPIO23），Serial 115200 輸出原因，進入 `while (true) { delay(1000); }`。純 OLED 課不將 I²C 腳當成 LED 拉低。
- 本版沿用各課模擬器支援的白名單語法；不接受任意 Arduino C/C++、自訂函式或函式庫。匯出檔可在 IDE 獨立修改，平台 `.json` 仍保留原學習程式。

## 固定編譯基準

`src/hardware/targets.ts` 為預覽、檔案註解、測試與編譯腳本的共用版本來源。

| 板型 | FQBN | 核心 |
| --- | --- | --- |
| UNO R3 | arduino:avr:uno | arduino:avr@1.8.8 |
| ESP32 Dev Module | esp32:esp32:esp32 | esp32:esp32@3.3.12 |

依課使用：Servo 1.3.0、ESP32Servo 3.2.1、DHT sensor library 1.4.7、Adafruit Unified Sensor 1.1.15、Adafruit GFX Library 1.13.0、Adafruit SSD1306 2.5.17、Adafruit BusIO 1.17.4、TM1637 1.2.0。

## 可重現驗證

Node 24、g++（產生碼行為檢查）、Arduino CLI 1.3.1。

```sh
npm test
npm run test:hardware-runtime
npm run build
npm run compile:sketches -- uno-r3 --install
npm run compile:sketches -- esp32 --install
```

`--install` 安裝固定版本，後續可省略；可用 `ARDUINO_CLI` 指定 binary、`ARDUINO_CLI_CONFIG` 指定隔離設定、`SKETCH_OUTPUT` 指定暫存輸出目錄（預設 /tmp/lab-arduino-sketches）。受限環境可設定 `XDG_CACHE_HOME` 至可寫路徑。產物不進版本庫，也不發布編譯後韌體。

本次證據：

- 原 193 項保留，新增 52 項，共 **245／245** 單元測試通過。涵蓋兩板全18課、標頭、原始位置／註解、改名、衝突、範圍、整數及時間型別、錯誤位置與未完成架構。
- **12／12** 產生後 C++ 行為測試通過：兩板各驗證負 PWM 步長、負溫度、millis 回捲、DHT NaN、OLED 初始化失敗、整合課失敗後關 LED／清屏。使用假硬體 adapter 執行真實產生碼，並非實體元件測試。
- Arduino CLI 1.3.1 對兩板 **36／36** 標準答案產生的 `.ino` 實際編譯通過；最後產生器輸出逐字對照已編譯檔案相同。ESP32Servo 有上游未使用變數警告；無編譯錯誤。
- 網站 production build 通過；保留既有主要 bundle >500kB 提示，預覽為按需載入的獨立 chunk。
- 無 Browser connector，使用環境既有 Python Playwright／Chromium。兩板桌面1280×900、320及390px：差異／完整碼、實際下載相等、空架構阻擋、取消、Esc、Tab循環與焦點返回、原JSON匯出通過。
- 兩板匯出期間草稿、程式、接線與既有 canvas 節點保留；暫停時間不變、執行中維持執行。另驗證深色面板搭配淺色頁面可讀、DHT／OLED版本與改名、無接線也可匯出、Esc保留待接端點。無未處理瀏覽器例外。
- Pages 工作流程新增兩板編譯 gate；單元／產生碼執行／網站建置／36份實際編譯皆通過後才部署。

尚未進行 Acer Aspire 5／實體 UNO 或 ESP32 燒錄、實際周邊與供電測試；不將上述軟體結果稱為硬體驗收。
