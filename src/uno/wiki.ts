import type {WikiArticle,ArticleId} from '../wiki/articles';
import type {LessonId} from '../lessons';
import {unoText} from '../boards/lessonProfiles.ts';
import {unoCourse} from './content.ts';
const topics:Partial<Record<ArticleId,LessonId>>={'setup-loop':'blink','button-pullup':'button-led','digital-read':'button-led','if-else':'button-led','dual-led':'dual-led','traffic-light':'traffic-light','button-toggle':'button-toggle','button-counter':'button-counter','millis-state':'button-toggle','buzzer-doorbell':'buzzer-doorbell','pwm-breathing':'pwm-breathing','rgb-mixing':'rgb-mixing','pot-dimming':'pot-dimming','ldr-nightlight':'ldr-nightlight','servo-angle':'servo-angle','ultrasonic-alert':'ultrasonic-alert','pir-delay':'pir-delay','climate-dht':'climate-dht','oled-i2c':'oled-i2c','seven-counter':'seven-counter','environment-lab':'environment-lab'};
const wiring:Record<LessonId,string>={
 blink:'D10 → 220Ω → LED A；LED K → GND。電阻可位於同一串聯支路前或後。',
 'button-led':'D2 INPUT_PULLUP 接按鈕A側，B側接GND。A1/A2同側相通，B1/B2同側相通，按下才連兩側。D10獨立控制LED。',
 'dual-led':'LED1使用D10，LED2使用D9，各自一顆220Ω與GND。不能共用一顆限流電阻。',
 'traffic-light':'紅D10、黃D9、綠D6，各自220Ω與LED。紅3秒 → 綠3秒 → 黃1秒，每階段只亮一顆。',
 'button-toggle':'D2上拉按鈕與D10 LED；全域變數保存穩定電位、上次變動時間及輸出。連續穩定50ms，只在HIGH→LOW時切換一次，長按不重複觸發。',
 'button-counter':'D2上拉按鈕與D10 LED；穩定50ms的有效按下才加一，放開不計數。全域變數觀察區顯示程式自己的計數，LED表示穩定按下。',
 'buzzer-doorbell':'內建驅動、5V邏輯相容的三腳主動式模組，VCC接5V、GND接地、S接D10。按鈕D2，按下LOW。不要把裸蜂鳴器當成可直接由GPIO驅動的模組。',
 'pwm-breathing':'D10串聯220Ω與LED。analogWrite值0～255，0全關、255全開，中間呈現平均亮度。D3／5／6／9／10／11支援PWM，但此課固定D10。',
 'rgb-mixing':'共陰極RGB：紅D10、綠D9、藍D6，各自一顆220Ω，K接GND。三色PWM分別0～255，光以加色方式混合；不模擬實際效率與白平衡。',
 'pot-dimming':'電位器VCC接5V、W接A0、GND接地。pinMode(A0,INPUT)後analogRead(A0)取0～1023；整數除以4轉成0～255給D10 PWM。不是ESP32的12位元ADC。',
 'ldr-nightlight':'5V → 光阻 → A0分壓點 → 10kΩ → GND。D10另用220Ω與LED。ADC低於375開燈、高於550關燈，中間維持，形成遲滯；滑桿為理想ADC而不是lux。',
 'servo-angle':'D9接SIG，外部5V供伺服VCC，外部GND與伺服及UNO共地。Servo arm;、arm.attach(9)、arm.write(0～180)。實板使用Arduino Servo函式庫與Servo.h，不用ESP32Servo。',
 'ultrasonic-alert':'外部5V供HC-SR04並與UNO共地，TRIG D7、ECHO D8。UNO為5V邏輯，Echo直接進D8，沒有ESP32版的1kΩ／2kΩ分壓。每次讀取前需LOW、HIGH至少10μs再LOW；pulseIn(8,HIGH,30000)，0為無回波或逾時，不能當零距離。',
 'pir-delay':'外部5V供PIR，OUT接D2，並與UNO共地。模型OUT為3.3V，滿足本課UNO R3的HIGH條件；實板需核對模組及輸入額定。讀到HIGH刷新millis，距最後HIGH滿3000ms才關D10 LED；再次活動重新計時。',
 'climate-dht':'三腳DHT22模組含5V DATA上拉：VCC5V、DATAD4、GND。DHT climate(4,DHT22);、begin後讀取。兩個方法共用2000ms快取；整數溫度≥30或溼度≥80亮D10 LED。實板float讀取失敗回NaN，需自行isnan處理。',
 'oled-i2c':'使用5V邏輯相容、具所需電位轉換的SSD1306模組，VCC5V、GND、SDA A4、SCL A5，地址0x3C。UNO使用Wire.begin()，不傳腳位。clearDisplay不重設游標也不立即改畫面；print／println修改緩衝，display()才顯示。',
 'seven-counter':'TM1637 5V相容模組：CLK D7、DIO D8、VCC5V、GND。TM1637Display digits(7,8);；showNumberDec(0～9999)不補零，每秒加一，超過9999回零。不是I²C，沒有0x3C地址。setBrightness只驗證0～7，不模擬亮度差。',
 'environment-lab':'DHT22 DATA D4、OLED SDA A4／SCL A5、LED D10，共十線。兩模組共用5V與GND，OLED必須具5V邏輯相容與電位轉換。每2000ms取樣，顯示整數溫溼度並display；溫度≥30或溼度≥80警示。任一裝置或接線失敗會診斷停止。',
};
export function unoArticle(original:WikiArticle,current:LessonId):WikiArticle{
 const lesson=topics[original.id]??current,course=unoCourse(lesson);
 const concepts:Partial<Record<ArticleId,string>>={
  'gpio-levels':'UNO R3採5V邏輯，HIGH／LOW是電位，不是固定電流。數位D0～D13，類比A0～A5也可作數位I/O；D0／D1與USB序列通訊共用。不要直接以GPIO供應馬達等大負載。',
  'pin-mode':'pinMode(pin,OUTPUT)設定輸出，INPUT讀取感測器，INPUT_PULLUP啟用上拉。按鈕未接地為HIGH，按下接地為LOW。各課只接受自己的指定腳位與模式。',
  'digital-write':'digitalWrite(pin,HIGH/LOW)只改指定腳位，需先設定OUTPUT；不會自動等待或關閉其他輸出。有效LED回路才會亮起。',
  'delay-time':'1000毫秒等於1秒。delay只維持目前狀態，亮與滅的等待加總才是一個閃爍週期。單次上限60000ms，loop必須有正值delay。暫停凍結虛擬時間。',
  'setup-loop':'setup執行一次，適合初始化；loop由排程器重複。全域整數保留狀態，區域整數每次進入函式重新建立。初始只給基本架構，完整答案需自行展開。',
  'led-circuit':'LED A為陽極、K為陰極，需限流且極性正確。每顆LED獨立220Ω；電阻可放在同一串聯支路前或後。220Ω是固定教學條件，實板須核對壓降、電流與功率。電流亮點只示意方向，非精準量測。',
  'digital-read':'digitalRead只取得執行當下的電位。按鈕D2 INPUT_PULLUP，按下LOW；PIR課D2 INPUT，HIGH代表活動。delay期間沒有讀取，短按可能被漏掉。',
  'if-else':'==與!=是比較，=是賦值。基本按鈕課只允許單層等於／不等於；進階課才開放大小比較、整數加減與最多四層if。不支援else if、&&、||或任意C++。',
 };
 return {...original,title:original.title.replace(/ESP32/g,'UNO R3')+' · UNO R3',summary:concepts[original.id]??course.goal,sections:[{title:'本課接線與操作',text:wiring[lesson]},{title:'板型差異',text:'UNO R3是ATmega328P／5V，A0～A5 ADC為0～1023，PWM0～255，I²C固定A4／A5。A4與SDA、A5與SCL各為同一電氣訊號的兩個實體排針端點，不可誤當獨立輸出。ICSP僅呈現外觀，不納入互動。'},{title:'練習提示',text:course.hint}],example:unoText(original.example,lesson),exampleNote:'此為單一概念示例，需先完成本課宣告、初始化與接線。完整解法可在程式練習主動展開。',mistakes:['套用ESP32的GPIO23、GPIO34或Wire.begin(21,22)，而沒有改用UNO課程腳位。','供電、地與訊號混接，或把無電位轉換的3.3V模組當作5V相容。','把即時輸入當成程式已讀到的值，或忘記OLED display()／正值等待。'],question:lesson==='pot-dimming'?'1023除以4後，為什麼得到255？':lesson==='ultrasonic-alert'?'為什麼UNO的5V Echo接法，不能直接搬回3.3V ESP32？':original.question.replace(/ESP32/g,'UNO R3'),limitation:'受限教學解譯，不編譯任意C++或載入原生函式庫。整數沿用32位元，未重現AVR 16位int、CPU、計時器、PWM波形或精確類比電路；實板規格與例外須另驗證。',references:[{label:'Arduino官方：UNO R3接腳文件',url:'https://docs.arduino.cc/resources/pinouts/A000066-full-pinout.pdf'},{label:'Arduino官方：UNO R3',url:'https://docs.arduino.cc/hardware/uno-rev3/'},...original.references.filter(ref=>!ref.url.includes('espressif')&&!ref.url.includes('esp32servo'))]};
}
export const unoOverview:WikiArticle={id:'uno-overview',title:'UNO R3 入門與板型差異',summary:'主要排針32個端點、5V邏輯；不是ESP32接腳表的另一種外觀。',sections:[{title:'接腳與別名',text:'D0～D13為數位I/O，A0～A5為10位元ADC且可作數位I/O。A4／SDA及A5／SCL為相同電氣訊號，三個主要GND各自可點選但共地。AREF、IOREF、RESET、VIN及NC不可當一般GPIO。'},{title:'學習方式',text:'先選開發板與專題，再接線及自行完成程式。切換板型會確認並停止程式、載入所選板型的該課草稿，外觀保留；換電腦請匯出／匯入練習檔，沒有自動雲端同步。ICSP只顯示外觀；本工具不燒錄、不連接實物。'}],example:'pinMode(10, OUTPUT);',exampleNote:'UNO第一課固定D10，非ESP32的GPIO23。',mistakes:['把A4與SDA當成兩個獨立腳。','將5V模組訊號直接接到ESP32。'],question:'為什麼同樣是Arduino語法，換板後仍要核對接腳、電壓與ADC範圍？',limitation:'理想教學模型，未重現AVR16位int、完整CPU或實體電路。',references:[{label:'Arduino：UNO R3',url:'https://docs.arduino.cc/hardware/uno-rev3/'}],related:['uno-esp32-differences','gpio-levels','pot-dimming','oled-i2c']};
export const unoDifferences:WikiArticle={id:'uno-esp32-differences',title:'UNO R3 與 ESP32：換板前要核對什麼',summary:'相同的教學目標，接腳、電壓、ADC、函式庫與接線仍可能不同。',sections:[{title:'接腳、電壓與ADC',text:'ESP32 DevKitC使用3.3V邏輯，本課ADC0～4095；UNO R3使用5V邏輯，ADC0～1023。UNO的A0不是ESP32的GPIO34；GPIO23也不是UNO的D23。類比讀值轉8位PWM時，本課ESP32除以16、UNO除以4。UNO PWM只支援D3／5／6／9／10／11，本課依專題限定其中腳位。'},{title:'I²C、伺服與5V感測訊號',text:'UNO OLED固定SDA A4／SCL A5，使用Wire.begin()，並要求5V邏輯相容及必要電位轉換的模組；ESP32本課用GPIO21／22。UNO伺服使用Servo函式庫，ESP32使用ESP32Servo。HC-SR04的5V Echo在UNO可直接D8，在ESP32課則必須先分壓，不能把UNO接法搬到ESP32。'},{title:'程式語法與真正硬體',text:'兩板都使用本工具的受限教學解譯器，不是CPU或任意C++編譯。模擬整數保留32位元；UNO實際AVR int通常為16位元，不能把模擬時間與溢位行為當作實板保證。實板DHT須檢查NaN、OLED須檢查初始化結果，馬達等負載要有適當電源並共地。'}],example:'// UNO R3：10位元 ADC\nint reading = analogRead(A0);',exampleNote:'須先依課程完成A0接線與模式；這不是完整調光答案。',mistakes:['只換板型外觀，保留ESP32接腳號碼。','把5V輸出送入ESP32，或把不具電位轉換的OLED當成5V相容。','將模擬器32位元int誤認為AVR實機int規格。'],question:'同一個電位器轉到最大位置，為什麼UNO與ESP32的原始ADC數字不同？',limitation:'範圍以本工具選定的UNO R3與ESP32 DevKitC V4為準，不適用UNO R4、其他模組或任意函式庫。',references:[{label:'Arduino UNO R3',url:'https://docs.arduino.cc/hardware/uno-rev3/'},{label:'Espressif DevKitC V4',url:'https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32/esp32-devkitc/user_guide.html'}],related:['uno-overview','pot-dimming','ultrasonic-alert','oled-i2c']};
