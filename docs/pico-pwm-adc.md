# Pico MicroPython 第4、5課：PWM呼吸燈與電位器調光

2026-10-31。Pico 2 W with headers 現有5課、8篇Wiki；此紀錄取代先前「Pico僅3課、PWM未開始」的歷史狀態。保留既有Arduino與Pico課程。

## 入口與接線

- `?board=pico-2-w&lesson=pwm-breathing#code`：GP15（實體20）、220 Ω、LED與GND；與外接LED課共用三線支路，新增PWM亮度控制。
- `?board=pico-2-w&lesson=pot-dimming#code`：同一LED支路，加10kΩ電位器VCC→3V3(OUT)（實體36）、W→GP26／ADC0（實體31）、GND→GND，共六線。
- `#wiring`：手動0～65535佔空比滑桿，不執行練習程式；切回程式模式清除手動輸出。
- 原有8個GND均可使用；電阻可在LED前或後。電位器依VCC／W／GND標示接線，不把ADC_VREF當電源、不使用VBUS 5V或其他ADC腳。

接線檢查沿用缺電阻、反極性、旁路、斷路、短路與不支援GPIO，另檢查3V3供電、電位器滑動端與GP26獨立連接、訊號短接電源／地、電源兩端反接。這是限定教學規則，不是完整電路求解。

3D新增電位器與隨原始讀值轉動的指示線；LED材質亮度由當前佔空比控制，電流亮點仍只走經驗證的LED支路，不流過ADC訊號線。範例顯示／隱藏還原原導線，不覆蓋程式；切換範例會停止輸出並將旋鈕恢復中點2048。

## 課程與語法契約

兩課均以空白架構開始，保留需自行取代的pass；完整解法仍須自行展開。補全跟隨PWM／ADC物件與變數改名，Wiki提供短例子與思考題，不直接填入整套答案。

新課支援：

- `from machine import Pin, PWM`；電位器課另匯入ADC，清單順序可變。
- 一個可改名的 `PWM(Pin(15))`，迴圈前先呼叫 `.freq(整數常值)`，本課限制1～20000Hz，預設1000Hz。
- `.duty_u16(整數算式)`，每次實際寫入須在0～65535；超界會診斷停止，不默默夾值或改寫程式。
- 電位器課的一個 `ADC(Pin(26))`、`.read_u16()`，可先存入整數變數或直接作為duty參數。
- 32位元有號整數常值／變數、加減、單一負號，單個算式最多32項；不支援任意Python算式、乘除、字串運算或函式呼叫。分支內只可修改已在分支外初始化的變數。
- 單層 `if`／可選 `else`，整數比較 `== != > < >= <=`，分支內8個空白。可有兩個依序的if作上下限判斷，不開放巢狀分支或for。
- 既有sleep／sleep_ms與while True；每條循環路徑均需正值等待，不支援的語法或未完成架構會指出行列並阻擋.py下載。

原三課維持既有語法白名單，沒有因新課而接受PWM、ADC或任意數值算式。

呼吸燈標準解法：duty先寫入brightness，再加step；每20ms更新1024，抵達上下限後夾在0／65535並反轉正負步長。理想虛擬時間1280ms達峰、2560ms回0。畫面與變數依使用者的實際敘述順序運作，不是固定動畫。

電位器標準解法：每50ms讀取read_u16並直接傳給duty_u16。RP2350 ADC原始解析度12位元，原始值0～4095；依MicroPython RP2實作，轉為 `(raw << 4) | (raw >> 8)`，得到0～65535，但只有4096種理想原始層級。中點原始值2048會得到32776，不假裝是16位元精度ADC。

官方來源：

- [MicroPython PWM](https://docs.micropython.org/en/latest/library/machine.PWM.html)
- [MicroPython ADC](https://docs.micropython.org/en/latest/library/machine.ADC.html)
- [固定版本RP2 ADC縮放實作](https://github.com/micropython/micropython/blob/321fba0d16fac669d39528ea1be6aefb5cd267c5/ports/rp2/machine_adc.c)：`bits = 12`及read_u16換算已核對。
- [Pico板型與40腳基準](pico-2-w-micropython.md)

PWM頻率與佔空比是API刻度，實際解析度仍受時脈／硬體限制。網站只畫平均亮度、取樣及離散接線，不模擬真實PWM波形、電流、ADC雜訊或感知亮度曲線。

## 執行、保存與實板

Worker加入受限數值算式、變數與比較節點，無eval／Function／任意Python執行。沿用12000字元、400行、256陳述、每次推進500操作、總100000操作與24小時虛擬時間限制；每次Worker tick最多推進200ms，避免背景分頁或暫時延遲讓一般呼吸燈一次追趕過多工作。

暫停時凍結PWM、最後ADC樣本、變數與虛擬時間；旋鈕仍可變更即時輸入，繼續後才取樣。Wiki／預覽不重建編輯器或3D場景。停止／重設及接線失效時PWM輸出歸零。

五課獨立保存程式、接線與範例原備份；Pico JSON維持v1並加入可選的12位元adc位置欄位，舊備份預設2048、原儲存鍵不變。匯入檢查0～4095整數，拒絕null、字串與超界。還原不自動執行，不保存執行變數或手動PWM輸出。

main.py仍以當前自己寫的程式產生，只加板型註解，不套用答案、不要求模擬接線完整。程式需使用Thonny上傳到已安裝Pico 2 W MicroPython韌體的實板。實板Ctrl+C可能保留硬體PWM，需在REPL呼叫 `.duty_u16(0)`或 `.deinit()`；deinit不在本課模擬語法內，Wiki已說明差異。

## 驗證與交接

- 原279項保留（更新Wiki總數斷言），新增18項，共 **297／297** 單元測試通過。涵蓋兩課Python語法、空架構、完整呼吸週期、負步長、敘述順序、頻率／duty／整數範圍、匯入／腳位／名稱、未知變數、分支與等待、ADC端點／4096種層級、取樣時間、接線錯誤、JSON遷移與補全。
- 兩課匯出後的真實Python在受控假Pin／PWM／ADC模組下各執行130次輸出，逐筆與教學VM時序／duty對照相同；這是軟體行為核對，不是MicroPython韌體或實體硬體驗收。另有Python ast.parse語法檢查。
- 既有12項產生後C++行為檢查通過；網站正式建置通過，沿用主要bundle大小提示。
- Browser plugin not available；使用既有Playwright／Chromium。兩課1440×1000桌面、320／390px：空架構、無接線仍可匯出、接線驗證、PWM／ADC執行、零／中／滿刻度、暫停保持、繼續、手動PWM、Wiki／預覽、下載逐字一致、JSON與旋鈕保存、分課匯入／首頁接續通過。
- 真實GP26／電位器W端點raycast可接線，範例顯示／還原、物件改名後補全、錯誤行列、5V錯接診斷、WebGL重試保留程式／接線／輸出、深色面板及手機版面通過；無未處理瀏覽器例外。
- 原板載LED、外接LED、按鈕課與UNO／ESP32匯出流程均做瀏覽器回歸；原兩板36份Arduino編譯仍是GitHub Pages發布gate。

目前Pico已有5課、8篇Wiki。下一個最小步驟為使用者試用與實板核對；本輪不自動展開感測器或其他專題。未進行Pico實板燒錄、實際電壓／PWM／ADC量測或Acer Aspire 5效能驗收。
