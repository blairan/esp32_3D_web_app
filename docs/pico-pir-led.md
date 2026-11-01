# Pico 第7課：PIR 人體移動感測燈

2026-11-01（Asia/Taipei）。接續光敏夜燈，新增 `pir-led`；Pico共7課、10篇Wiki，三板型共43課。

## 目標與教學契約

入口：`?board=pico-2-w&lesson=pir-led#intro`。沿用認識專題／接線／寫程式／觀察結果四步，不重建編輯器、Worker或3D場景。預設架構先關LED，再建立 `pir = Pin(14, Pin.IN)`；while內只留待完成的pass，不預填完整答案。標準答案需主動展開，不自動改動程式。

本課用PIR主動輸出的3.3V訊號控制LED：活動為1，沒有活動為0。和按鈕課的Pin.PULL_UP／按下為0不同，不能混用。每50ms透過 `if pir.value() == 1:`／else判斷，正值等待可由使用者調整；網站遵循實際程式，不固定動畫或自動延遲關燈。

僅新增本課GP14的Pin.IN物件；支援改名、value()與單層等於0／1的分支。保留原六課白名單，不開放PULL_DOWN、中斷、任意Python、巢狀迴圈或PIR的ADC／PWM API；沿用來源長度、陳述、操作與虛擬時間上限。

## 板型、供電與接線

本模型限定為5V供電、OUT為3.3V邏輯的PIR教學模組，位置與外觀是簡化示意，不宣稱所有PIR實板接腳排列相同。

| 端點 | 接法 |
|---|---|
| Pico VBUS（實體40，USB 5V） | PIR VCC |
| PIR OUT（3.3V） | GP14（實體19） |
| PIR GND | 任一Pico GND |
| GP15（實體20） | 220Ω→LED A+／K−→GND |

範例共6條導線。VBUS僅在USB供電時作為本課5V來源，不能接GPIO；VSYS與3V3(OUT)不代替本課VBUS。實板PIR供電、輸出電壓、腳位次序及可用USB供電須依實際規格核對。

接線圖檢查供電、共地、OUT獨立連接、LED極性與串聯限流，拒絕缺線、VBUS接GPIO／地／LED支路、OUT短接地／電源、電源極性反接、錯誤GPIO與元件旁路。接線無效會診斷、停止程式並清除輸出。有效電流亮點只走LED支路，不把PIR訊號線畫成LED供電路徑。

3D新增簡化PIR底板、白色感測罩、三端點與較大點選區；鍵盤端點仍可完成接線。範例顯示／隱藏會還原原接線，不覆蓋程式。

## 輸入、狀態與保存

「模擬偵測到活動」是獨立的理想環境輸入；顯示即時OUT與程式上次讀值，LED仍由程式控制。暫停時可改輸入，但樣本、輸出、波形與虛擬時間保持，繼續後才取樣。四步切換、Wiki、匯出不清除活動輸入；停止清除程式輸出，環境輸入保留。顯示範例或清空接線則重設活動輸入。

手動輸出需明確進入並停止程式；重新執行退出手動模式。LED數位波形沿用實際命令與虛擬時間，另可看獨立正弦參考，不新增PIR距離、人體位置或假的儀表數值。

新Wiki解釋供電／訊號差別、Pin.IN、高電位觸發、取樣及實板限制；補全跟隨PIR／LED改名，連至對應文章。main.py預覽／下載只使用自己的程式，保留註解，不要求模擬接線完成；不支援或未完成的程式有行列診斷並阻擋下載。

Pico JSON保留v1與既有六課草稿鍵。新課獨立鍵新增可選布林motion，舊備份缺此欄位時預設false；原六課輸出不新增此欄位。保存程式、接線、範例原備份與活動輸入，重開後不自動執行。跨課匯入驗證端點，保護離開課程的既有草稿。

## 來源與限制

- [MicroPython Pin官方API](https://docs.micropython.org/en/latest/library/machine.Pin.html)：Pin.IN、Pin.OUT、value。
- [Adafruit PIR接線教學](https://learn.adafruit.com/pir-passive-infrared-proximity-motion-sensor/using-a-pir)：5V供電與共地。
- [Adafruit PIR測試](https://learn.adafruit.com/pir-passive-infrared-proximity-motion-sensor/testing-a-pir)：活動時OUT為3.3V，並需啟動穩定時間。
- [Pico 2 W板型／接腳基準](pico-2-w-micropython.md)。

PIR回報活動造成的紅外線變化，不保證偵測靜止的人。介面不使用攝影機，不模擬紅外線、預熱、靈敏度、觸發範圍或模組內建延遲，不宣稱人體辨識、安全警報或實板驗收。main.py仍需對應UF2韌體與Thonny上傳，網站不直接燒錄。

## 驗證與交接

- 原332項保留（更新Wiki數量），新增12項，共344／344測試通過。涵蓋主動高電位、時間取樣、使用者邏輯／改名、模式隔離、錯誤位置、等待限制、供電／訊號各種錯接、共地與電流方向、JSON相容及補全。
- 匯出Python通過ast.parse；實際Python在受控Pin／time替身下執行，正常／反向條件各8次取樣逐筆與VM一致。此為軟體語法與行為比對，不是MicroPython韌體或實板量測。
- 既有12項產生後C++行為測試、TypeScript與Vite正式建置通過，保留既有bundle大小提示。
- Browser plugin not available，使用現有Playwright／Chromium軟體WebGL，沒有安裝新依賴。新課1440px／1280×720／390／320px：頁面識別、非空畫面、無框架錯誤覆蓋層、無頁面／主控台錯誤、截圖與實際互動均通過；另驗證GP14／PIR OUT真實raycast、範例還原、改名補全、輸入／取樣／暫停／步驟、Wiki目錄／返回／Esc／焦點、下載逐字一致、JSON還原、失效供電停止與手動接管。

七課執行／暫停／四步與320px回歸、跨課匯入保護、UNO／ESP32基本執行／波形檢查均通過，無頁面或主控台錯誤。

沿既有main→GitHub Pages流程發布，兩板36份Arduino編譯仍為gate。未進行Acer Aspire 5實機效能、實體PIR接線／延遲量測或Pico燒錄。下一個最小步驟為使用者試用此課，核對活動輸入、程式取樣與燈號，再決定下一課。
