# Pico MicroPython：外接 LED 與按鈕控制

2026-10-31，接續 Pico 2 W with headers 首課，新增第2、3課。此紀錄更新「Pico目前僅有板載LED首課」的歷史狀態；現在共有3課、6篇Wiki。PWM尚未開始。

## 入口與實板對應

- `?board=pico-2-w&lesson=external-led#code`：GP15／實體20 → 220 Ω → 外接LED A+／K− → GND，預期亮1秒、滅1秒。
- `?board=pico-2-w&lesson=button-led#code`：上述LED支路，加GP14／實體19 → 四腳按鈕A側、B側 → GND；使用 `Pin.IN, Pin.PULL_UP`，按下讀0、放開讀1。預期按下亮、放開滅，每20ms輪詢。
- `#wiring`：目前課程的手動輸出與接線檢查，不執行編輯器中的程式。
- GP數字不是實體腳號，GP15、GP14對照既有 [官方40腳基準](pico-2-w-micropython.md) 與 [CSV](pico-2-w-pins.csv)。兩課不控制板載LED，仍使用Pico 2 W專用MicroPython韌體與Thonny上傳main.py。

## 接線與教學規則

新增獨立電阻、LED、四腳按鈕及點選區，可用3D或下方端點清單接線／刪線，最多12條。所有8個主排針GND位置可用，電氣共地但可分別選取。電阻無方向，可串在LED前或後；LED方向仍須正確。

按鈕A1／A2內部相通，B1／B2同理，按下才跨接A與B。GP14必須與GND跨兩側；接同側、輸入直接接地或與LED輸出共線不算有效接線。內建上拉已提供放開電位，不另接3V3。

診斷包含缺電阻、電阻旁路、LED反接／短接、斷路、GPIO直接接地、電源或不支援GPIO、按鈕同側與未完成輸入。這是指定接線的離散教學規則，不計算精確電流、電阻壓降或機械彈跳。

「顯示接線範例」只替換接線，保存原接線；再按「隱藏接線範例」還原原本導線。不改動編輯器程式。操作會重設程式輸出與瞬時按鈕，避免沿用舊輸出。範例顯示期間原備份會一起保存／匯出，重新整理後仍可隱藏還原。

LED只在有效支路與高電位時亮。電流亮點依GP15→電阻／LED→GND的有效路徑前進，不因兩端點的點選順序反轉，不流過按鈕訊號線。暫停時保持位置；簡化／減少動態模式使用靜態提示；可關閉電流效果。

## 程式與 Wiki

保留空架構、補全、可展開／複製答案及自行完成的練習。外接課限定一個 `Pin(15, Pin.OUT)`；按鈕課另接受可改名的 `Pin(14, Pin.IN, Pin.PULL_UP)`。

按鈕課新增單層：

```python
if button.value() == 0:
    # 8個空白的分支指令
    pass
else:
    # 另一分支；實際練習需取代pass
    pass
```

條件只接受已宣告輸入物件的 `.value() == 0或1`。不支援其他比較、變數算式、巢狀分支、for、自訂函式或其他import。每條循環路徑都需正值等待，可放在分支後，也可放在兩條分支內；單邊等待會拒絕。

解析為有限指令與分支，再交Worker執行，不使用eval／Function或任意Python。延續12000字元、400行、256陳述、單次推進500操作、總100000操作與24小時虛擬時間上限。按鈕狀態變動不會改動暫停的上次讀值或輸出；繼續執行才取樣。瀏覽器顯示與真實按鈕的牆鐘延遲不作精準硬體保證。

新增「GP15外接LED、極性與限流電阻」及「GP14按鈕、PULL_UP與if／else」Wiki。練習目標、接線原理與補全說明開啟對應內容。Wiki不提供完整答案；標準答案仍由使用者展開選看。官方參考：

- <https://docs.micropython.org/en/latest/rp2/quickref.html>
- <https://docs.micropython.org/en/latest/library/machine.Pin.html>

## 保存、匯出及相容性

- 三課各自保存程式、導線與範例原備份；首頁接續最近課程。按鈕瞬時／保持按下、手動輸出及執行狀態不持久保存，還原不自動執行。
- `.json`維持Pico v1格式，新增wires／backup；舊板載LED備份缺少這些欄位時還原空接線。原blink儲存鍵不變。各課備份驗證課程與端點，不接受外接課中不存在的按鈕物件。
- 匯入其他Pico課程的JSON會切到目的課，原頁的離開保存不覆蓋匯入內容。Arduino備份格式與Pico分開。
- `.py`預覽／下載仍使用當前自己寫的程式，不用標準答案；不要求模擬接線已完成，也不改寫程式邏輯、名稱或註解。語法／板型接腳不符及未完成架構會阻擋下載。
- 開始模擬需要有效課程接線；執行／暫停期間改壞接線會關燈、顯示接線診斷並停止。這不表示瀏覽器已編譯使用者程式。

主要程式：`src/pico/courses.ts`、`types.ts`、`circuit.ts`、`circuitScene.ts`、`language.ts`、`python.worker.ts`、`storage.ts`、`completion.ts`及Pico元件。UNO／ESP32資料、Arduino解析與匯出內容不變。

## 驗證

- 原259項保留並更新Wiki數量斷言，新增20項，共 **279／279** 通過：三課匯出Python語法、原空架構、LED時序、八個GND、電阻位置／方向、錯接、按鈕兩側／反轉、電流方向、20ms取樣、改名、分支等待、錯誤位置、JSON遷移與補全。
- Python 3的ast.parse只檢查產生檔語法，不代表在真正MicroPython韌體上執行。既有12項產生後C++行為檢查通過；網站建置通過，保留既有主要bundle大小提示。
- Browser plugin not available，使用既有Playwright／Chromium；1440×1000、320／390px。兩新課驗證：無接線仍可匯出、執行接線診斷、手動接線、範例切換還原、Worker執行、暫停／繼續、即時與上次讀值、Wiki入口、下載逐字相等、JSON／重新整理、分課保存、首頁接續、跨課匯入、手機全螢幕。
- 真實3D pin／元件 raycast可建立導線；3D按鈕、鍵盤按壓／放開、Esc保留Wiki後的待接起點、下一次Esc取消、執行中移除導線關燈、手動HIGH／LOW及改名後if補全與8空白縮排通過。
- 原板載LED完整流程及UNO／ESP32匯出／執行／手機版面回歸通過；未發現未處理瀏覽器例外。
- 沿既有main→GitHub Pages流程，原兩板36份Arduino實際編譯仍是發布gate。

未進行實體Pico接線、Thonny燒錄或Acer Aspire 5效能驗收。下一項可做PWM呼吸燈，本輪不自動開始。
