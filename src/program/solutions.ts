import type {LessonId} from '../lessons.ts';
import {blinkExample} from './language.ts';
export const solutions:Record<LessonId,{title:string;code:string;notes:string[]}>= {
 blink:{title:'LED 閃爍參考解法',code:blinkExample,notes:['setup 將 GPIO23 設為 OUTPUT。','loop 依序輸出 HIGH、等待 1000 毫秒、輸出 LOW、再等待 1000 毫秒；完整週期為 2 秒。','先完成 GPIO23 → 電阻 → LED → GND 接線；程式正確但接線錯誤時，LED 仍不會亮。']},
 'button-led':{title:'按鈕控制 LED 參考解法',code:`int ledPin = 23;
int buttonPin = 18;

void setup() {
  pinMode(ledPin, OUTPUT);
  pinMode(buttonPin, INPUT_PULLUP);
}

void loop() {
  int buttonState = digitalRead(buttonPin);

  if (buttonState == LOW) {
    digitalWrite(ledPin, HIGH);
  } else {
    digitalWrite(ledPin, LOW);
  }

  delay(50);
}
`,notes:['GPIO18 使用 INPUT_PULLUP：放開讀取 HIGH，按下接地讀取 LOW。','每次 loop 重新宣告並讀取 buttonState，用 if／else 決定 GPIO23 輸出。','delay(50) 放在分支後，讓兩條路徑都有等待；它是輪詢間隔，不是硬體去彈跳。','先載入接線範例或自行完成五條接線。暫停時按鈕仍可改變，但須繼續執行到下一次讀取才影響 LED。']},
 'dual-led':{title:'雙 LED 交替閃爍參考解法',code:`int led1 = 23;
int led2 = 22;

void setup() {
  pinMode(led1, OUTPUT);
  pinMode(led2, OUTPUT);
}

void loop() {
  digitalWrite(led1, HIGH);
  digitalWrite(led2, LOW);
  delay(1000);

  digitalWrite(led1, LOW);
  digitalWrite(led2, HIGH);
  delay(1000);
}
`,notes:['兩顆 LED 各用一顆 220 Ω 電阻；GPIO23 對應 LED 1，GPIO22 對應 LED 2。','兩個接腳都先設定 OUTPUT；設定其中一腳不會自動設定另一腳。','每個階段都明確寫出兩顆 LED 的電位。各維持 1000 毫秒，完整循環為 2 秒。','這些是循序執行的陳述，不是假裝兩個寫入同時發生；本課不需要新增 if、迴圈或其他語法。']},

 'traffic-light':{title:'紅黃綠交通號誌參考解法',code:"int red = 23;\nint yellow = 22;\nint green = 21;\n\nvoid setup() {\n  pinMode(red, OUTPUT);\n  pinMode(yellow, OUTPUT);\n  pinMode(green, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(yellow, LOW);\n  digitalWrite(green, LOW);\n  digitalWrite(red, HIGH);\n  delay(3000);\n\n  digitalWrite(red, LOW);\n  digitalWrite(green, HIGH);\n  delay(3000);\n\n  digitalWrite(green, LOW);\n  digitalWrite(yellow, HIGH);\n  delay(1000);\n}\n",notes:['三顆 LED 各有一顆 220 Ω 電阻；紅 GPIO23、黃 GPIO22、綠 GPIO21。','setup 逐一設定三個 OUTPUT；每階段先關閉前一顆再點亮下一顆。','紅 3000 毫秒 → 綠 3000 毫秒 → 黃 1000 毫秒，完整週期為 7000 毫秒。','這是簡化教學號誌，沒有行人、交叉路口、真實交通控制或硬體安全保證。']},
 "button-toggle":{"title": "按一次切換 LED參考解法", "code": "int lastReading = HIGH;\nint stableState = HIGH;\nint lastChange = 0;\nint ledState = 0;\n\nvoid setup() {\n  pinMode(23, OUTPUT);\n  pinMode(18, INPUT_PULLUP);\n}\n\nvoid loop() {\n  int reading = digitalRead(18);\n  int now = millis();\n  if (reading != lastReading) {\n    lastChange = now;\n  }\n  if (now - lastChange >= 50) {\n    if (reading != stableState) {\n      stableState = reading;\n      if (stableState == LOW) {\n        ledState = 1 - ledState;\n      }\n    }\n  }\n  lastReading = reading;\n  digitalWrite(23, ledState);\n  delay(10);\n}\n", "notes": ["全域變數保留上次讀值、穩定電位與最後變動時間；millis() 是虛擬時間。", "讀值每次改變都重新計時；連續穩定至少 50 毫秒後才接受改變。", "只在穩定電位從 HIGH 變 LOW 時觸發；長按與放開不會重複觸發。", "ledState 在 0／1 間切換，放開仍保持結果。", "delay(10) 是取樣間隔；實際按鈕為理想接點，去彈跳邊界以注入輸入序列測試，非真實硬體驗證。", "執行／重設會從零開始，暫停保留；不支援實際 millis 溢位或任意 Arduino 語法。"]},
 "button-counter":{"title": "按鈕計數器參考解法", "code": "int lastReading = HIGH;\nint stableState = HIGH;\nint lastChange = 0;\nint count = 0;\n\nvoid setup() {\n  pinMode(23, OUTPUT);\n  pinMode(18, INPUT_PULLUP);\n}\n\nvoid loop() {\n  int reading = digitalRead(18);\n  int now = millis();\n  if (reading != lastReading) {\n    lastChange = now;\n  }\n  if (now - lastChange >= 50) {\n    if (reading != stableState) {\n      stableState = reading;\n      if (stableState == LOW) {\n        count = count + 1;\n      }\n    }\n  }\n  lastReading = reading;\n  digitalWrite(23, 1 - stableState);\n  delay(10);\n}\n", "notes": ["全域變數保留上次讀值、穩定電位與最後變動時間；millis() 是虛擬時間。", "讀值每次改變都重新計時；連續穩定至少 50 毫秒後才接受改變。", "只在穩定電位從 HIGH 變 LOW 時觸發；長按與放開不會重複觸發。", "count 每次有效按下加 1；在全域變數觀察區查看，LED 僅表示穩定按下狀態。", "delay(10) 是取樣間隔；實際按鈕為理想接點，去彈跳邊界以注入輸入序列測試，非真實硬體驗證。", "執行／重設會從零開始，暫停保留；不支援實際 millis 溢位或任意 Arduino 語法。"]},
"buzzer-doorbell":{"title": "主動式蜂鳴器門鈴參考解法", "code": "void setup() {\n  pinMode(23, OUTPUT);\n  pinMode(18, INPUT_PULLUP);\n}\n\nvoid loop() {\n  int pressed = digitalRead(18);\n  if (pressed == LOW) {\n    digitalWrite(23, HIGH);\n  } else {\n    digitalWrite(23, LOW);\n  }\n  delay(20);\n}\n", "notes": ["GPIO18 內建上拉，按下 LOW；GPIO23 控制模組 S，VCC 由 3V3 供應。", "模組需為內建驅動且 3.3V 相容的三腳主動式模組；不可把裸蜂鳴器假設成可直接接 GPIO。", "按下發聲、放開安靜；固定音調由模組產生，不使用 tone。示意音須自行開啟。"]},
"pwm-breathing":{"title": "PWM 呼吸燈參考解法", "code": "int brightness = 0;\nint step = 5;\n\nvoid setup() {\n  pinMode(23, OUTPUT);\n}\n\nvoid loop() {\n  analogWrite(23, brightness);\n  brightness = brightness + step;\n  if (brightness >= 255) {\n    brightness = 255;\n    step = 0 - 5;\n  }\n  if (brightness <= 0) {\n    brightness = 0;\n    step = 5;\n  }\n  delay(30);\n}\n", "notes": ["GPIO23、220 Ω 與 LED 串聯，沿用第一課三條線。", "本課限定 analogWrite(23, duty)，duty 為 0～255。0 全關，255 全開，中間值是 PWM 佔空比。", "每 30ms 更新 5，從 0 到 255 約 1530ms，再回到 0 約 3060ms；這是虛擬時序。", "步長以 0 - 5 反向，明確限制端點；不使用未支援的 for、++、乘除或 ledc API。", "ESP32 Arduino analogWrite 是 PWM，並非真正類比輸出；預設 1000Hz／8位元，此模擬僅呈現平均亮度。"]},
"rgb-mixing":{"title": "RGB 混色參考解法", "code": "void setup() {\n  pinMode(23, OUTPUT);\n  pinMode(22, OUTPUT);\n  pinMode(21, OUTPUT);\n}\n\nvoid loop() {\n  analogWrite(23, 255);\n  analogWrite(22, 0);\n  analogWrite(21, 0);\n  delay(1000);\n\n  analogWrite(23, 255);\n  analogWrite(22, 255);\n  analogWrite(21, 0);\n  delay(1000);\n\n  analogWrite(23, 255);\n  analogWrite(22, 255);\n  analogWrite(21, 255);\n  delay(1000);\n}\n", "notes": ["紅23、綠22、藍21 各自設定 OUTPUT，三色各一顆 220 Ω，K 共陰極接 GND。", "紅 → 黃（紅加綠）→ 白（三色），每階段 1000ms，週期 3000ms。", "每階段明確設定三色，不會自動關閉上一階段。這是加色示意，不是實際白平衡或亮度校正。"]},
"pot-dimming":{"title": "電位器調光參考解法", "code": "void setup() {\n  pinMode(34, INPUT);\n  pinMode(23, OUTPUT);\n}\n\nvoid loop() {\n  int reading = analogRead(34);\n  int brightness = reading / 16;\n  analogWrite(23, brightness);\n  delay(50);\n}\n", "notes": ["GPIO34（J2-05）只做 ADC；電位器 VCC → 3V3、W → GPIO34、GND → GND。", "理想 ADC 0～4095 整數除以 16 得 0～255；採向零截斷，4095 / 16 為 255。", "每 50ms 讀取一次；暫停時旋鈕可改變，但程式上次讀值和輸出保留，繼續後再讀。", "不計算精確電壓、雜訊、非線性或輸入阻抗；實物 ADC 請另核對文件。"]},
"ldr-nightlight":{"title": "光敏夜燈參考解法", "code": "void setup() {\n  pinMode(34, INPUT);\n  pinMode(23, OUTPUT);\n}\n\nvoid loop() {\n  int light = analogRead(34);\n  if (light < 1500) {\n    digitalWrite(23, HIGH);\n  }\n  if (light > 2200) {\n    digitalWrite(23, LOW);\n  }\n  delay(50);\n}\n", "notes": ["3V3 → 光阻 → 分壓點／GPIO34 → 10 kΩ → GND；LED 另用 220 Ω。", "ADC 低於 1500 開、大於 2200 關；1500～2200 保留輸出，形成遲滯。", "光照滑桿提供理想 ADC，不是 lux 或精確光阻特性；實機需校準門檻。"]},
"servo-angle":{"title": "伺服角度參考解法", "code": "Servo arm;\n\nvoid setup() {\n  arm.attach(23);\n}\n\nvoid loop() {\n  arm.write(0);\n  delay(1000);\n  arm.write(90);\n  delay(1000);\n  arm.write(180);\n  delay(1000);\n}\n", "notes": ["模擬器只接受一個全域 Servo 物件與 attach／write；名稱可自行命名。", "實板需安裝 ESP32Servo 並加入 #include <ESP32Servo.h>；本模擬器不處理標頭或任意函式庫。", "伺服採外部 5V，SIG 接 GPIO23，供電與開發板必須共地。", "理想 0 → 90 → 180 度，各保持一秒；停止／重設取消控制，模型回 90 度示意初始位置，不代表實物斷電會自動歸位。"]},
"ultrasonic-alert":{"title": "超音波測距警示參考解法", "code": "void setup() {\n  pinMode(23, OUTPUT);\n  pinMode(22, OUTPUT);\n  pinMode(34, INPUT);\n}\n\nvoid loop() {\n  digitalWrite(22, LOW);\n  delayMicroseconds(2);\n  digitalWrite(22, HIGH);\n  delayMicroseconds(10);\n  digitalWrite(22, LOW);\n  int duration = pulseIn(34, HIGH, 30000);\n  int distance = duration / 58;\n  if (duration == 0) {\n    digitalWrite(23, LOW);\n  } else {\n    if (distance < 20) {\n      digitalWrite(23, HIGH);\n    } else {\n      digitalWrite(23, LOW);\n    }\n  }\n  delay(60);\n}\n", "notes": ["外部 5V 供電並共地；TRIG 接 GPIO22；5V Echo 經 1 kΩ／2 kΩ 分壓進 GPIO34，不能直連。", "至少 10 μs HIGH 再 LOW，每次 pulseIn 都需要新的有效觸發。", "理想 pulse = cm × 58，duration / 58 得整數 cm；0 表示無回波或 timeout，必須先排除，不能當零距離。", "pulseIn 僅回傳理想教學值，不實際等待回波；delayMicroseconds 以虛擬微秒推進，loop 仍保留 60ms 等待。"]},
"pir-delay":{"title": "PIR 延遲燈參考解法", "code": "int lastMotion = 0;\n\nvoid setup() {\n  pinMode(27, INPUT);\n  pinMode(23, OUTPUT);\n}\n\nvoid loop() {\n  int activity = digitalRead(27);\n  if (activity == HIGH) {\n    lastMotion = millis();\n    digitalWrite(23, HIGH);\n  } else {\n    if (millis() - lastMotion >= 3000) {\n      digitalWrite(23, LOW);\n    }\n  }\n  delay(50);\n}\n", "notes": ["模型為外部 5V 供電、3.3V 邏輯 OUT 的 PIR 模組；OUT 接 GPIO27，與開發板共地。", "讀到 HIGH 時亮燈並刷新 lastMotion；LOW 時距最近一次程式讀到 HIGH 達 3000ms 才關燈。", "每 50ms 輪詢，停止活動到關燈約 2950～3000ms；再次活動重新計時。不是 delay(3000) 卡住讀取。", "虛擬模組不模擬預熱、靈敏度、內建延遲與真人，也不使用鏡頭；暫停保留時間與輸出。"]},
"climate-dht":{"title": "溫溼度感測參考解法", "code": "DHT climate(4, DHT22);\n\nvoid setup() {\n  climate.begin();\n  pinMode(23, OUTPUT);\n}\n\nvoid loop() {\n  int temperature = climate.readTemperature();\n  int humidity = climate.readHumidity();\n  if (temperature >= 30) {\n    digitalWrite(23, HIGH);\n  } else {\n    if (humidity >= 80) {\n      digitalWrite(23, HIGH);\n    } else {\n      digitalWrite(23, LOW);\n    }\n  }\n  delay(2000);\n}\n", "notes": ["DHT22 三腳模組含 DATA 上拉至 3.3V；GPIO4（J3-13）、VCC 3V3、GND。", "兩個方法共用每 2000ms 更新的樣本；此課只提供整數，實板回傳浮點數時指派給 int 會截斷。", "模擬讀取失敗在下次刷新時診斷停止；實板通常回 NaN，必須另做 isnan 等錯誤處理。", "實板需安裝 DHT sensor library 及相依函式庫並加入 #include <DHT.h>；模擬器不處理標頭。"]},
"oled-i2c":{"title": "OLED 文字顯示參考解法", "code": "Adafruit_SSD1306 display(128, 64, &Wire, -1);\nint count = 0;\n\nvoid setup() {\n  Wire.begin(21, 22);\n  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);\n  display.setTextSize(1);\n  display.setTextColor(SSD1306_WHITE);\n}\n\nvoid loop() {\n  display.clearDisplay();\n  display.setCursor(0, 0);\n  display.println(\"ESP32 Lab\");\n  display.print(\"Count: \");\n  display.println(count);\n  display.display();\n  count = count + 1;\n  delay(1000);\n}\n", "notes": ["3.3V I²C OLED 模組，SDA GPIO21、SCL GPIO22、位址 0x3C；模組含 3.3V 上拉。", "clearDisplay 不會立即熄滅已提交畫面；print／println 更新緩衝區，display 才顯示。", "本課只支援 ASCII 與整數，文字大小 1／2，並以近似字形呈現；沒有完整 GFX 圖形或中文字庫。", "實板需 Wire、Adafruit_GFX、Adafruit_SSD1306 標頭及函式庫；應另檢查 begin 回傳值。本模擬器初始化失敗直接診斷。"]},
};
