import {lessons,type LessonId} from '../lessons.ts';
import {loadExercise} from '../loadExercises.ts';
import {buttonExercise} from '../buttonExercises.ts';
import type {ArticleId} from '../wiki/articles.ts';
import {unoCourse} from '../uno/content.ts';
const expected:Record<LessonId,string>={
 blink:'LED 依程式安排的等待時間交替亮滅。','button-led':'按住按鈕時 LED 亮起，放開時熄滅。','dual-led':'兩顆 LED 輪流亮起。','traffic-light':'紅、綠、黃依序亮起，同一時間只有一顆燈亮。','button-toggle':'每次有效按下切換一次 LED，持續按住不重複切換。','button-counter':'每次有效按下只計數一次，可在變數觀察區對照。','buzzer-doorbell':'按鈕控制主動式蜂鳴器的開關。','pwm-breathing':'PWM 數值往返變化，LED 呈現漸亮、漸暗。','rgb-mixing':'三個 PWM 通道共同決定 RGB 的顏色與平均亮度。','pot-dimming':'改變電位器位置後，程式讀取 ADC 並更新 LED 亮度。','ldr-nightlight':'改變理想光照輸入，觀察程式如何依門檻開關 LED。','servo-angle':'伺服依程式指定的有效角度轉動。','ultrasonic-alert':'改變距離或回波輸入，觀察量測與警示輸出。','pir-delay':'活動輸入觸發 LED，程式依虛擬時間安排延遲熄燈。','climate-dht':'改變溫溼度輸入，對照程式取樣與 LED 警示。','oled-i2c':'程式完成初始化並提交後，OLED 顯示文字。','seven-counter':'TM1637 依程式顯示與更新四位數計數。','environment-lab':'DHT22 取樣資料由 OLED 顯示，LED 依程式條件警示。',
};
const partNames:Record<string,string>={resistor:'220 Ω 限流電阻',resistor2:'第二顆 220 Ω 限流電阻',resistor3:'第三顆 220 Ω 限流電阻',led:'LED',led2:'第二顆 LED',led3:'第三顆 LED',button:'常開按鈕',buzzer:'主動式蜂鳴器模組',rgb:'共陰極 RGB LED',pot:'電位器',ldr:'光敏電阻',divider:'10 kΩ 分壓電阻',servo:'伺服馬達',supply:'外部 5V 電源',ultra:'超音波感測器',echo1:'1 kΩ Echo 分壓電阻',echo2:'2 kΩ Echo 分壓電阻',pir:'PIR 模組',dht:'DHT22 模組',oled:'SSD1306 OLED'};
export function arduinoGuide(id:LessonId,uno=false){
 const exercise=buttonExercise(id)??loadExercise(id),course=uno?unoCourse(id):null;
 return {topic:course?.topic??exercise?.topic??(id==='blink'?'setup-loop':id==='button-led'?'button-pullup':id==='dual-led'?'dual-led':'traffic-light') as ArticleId,goal:course?.goal??exercise?.goal??(id==='blink'?'設定 GPIO23 為輸出，讓 LED 亮、等待、熄滅，再等待。':id==='button-led'?'以 GPIO18 INPUT_PULLUP 讀取按鈕，控制 GPIO23 LED。':id==='dual-led'?'使用 GPIO23 與 GPIO22，讓兩顆 LED 交替閃爍。':'紅 GPIO23、黃 GPIO22、綠 GPIO21：紅3秒、綠3秒、黃1秒。'),expected:expected[id],parts:Object.keys(lessons[id].parts).map(k=>k.split(':')[0]).filter((p,i,a)=>a.indexOf(p)===i&&(!uno||id!=='ultrasonic-alert'||!p.startsWith('echo'))).map(p=>p==='oled'&&id==='seven-counter'?'TM1637 四位數顯示器':partNames[p]??p)};
}
