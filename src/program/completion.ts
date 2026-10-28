import {hasStatefulButton,type LessonId} from '../lessons.ts';
export interface Suggestion {label:string;detail:string;template:string;type:string}
export const lessonSuggestions:Suggestion[]=[
 {label:'pinMode',detail:'pinMode(pin, OUTPUT) · 設定輸出接腳',template:'pinMode(${1:23}, ${2:OUTPUT});',type:'function'},
 {label:'digitalWrite',detail:'digitalWrite(pin, HIGH/LOW) · 控制高低電位',template:'digitalWrite(${1:23}, ${2:HIGH});',type:'function'},
 {label:'delay',detail:'delay(ms) · 等待 0–60000 毫秒',template:'delay(${1:1000});',type:'function'},
 {label:'int',detail:'宣告整數變數',template:'int ${1:ledPin} = ${2:23};',type:'keyword'},
 ...['OUTPUT','HIGH','LOW'].map(label=>({label,detail:label==='OUTPUT'?'輸出模式':label==='HIGH'?'高電位':'低電位',template:label,type:'constant'})),
];
export function declaredVariables(before:string):string[]{
 const clean=before.replace(/\/\*[\s\S]*?(?:\*\/|$)|\/\/[^\n]*/g,' ');
 const scopes:string[][]=[[]];
 for(const match of clean.matchAll(/\bint\s+([A-Za-z_]\w*)\s*=[^;{}]*;|[{}]/g)){
  if(match[0]==='{')scopes.push([]);else if(match[0]==='}') {if(scopes.length>1)scopes.pop();}else scopes.at(-1)!.push(match[1]);
 }
 return [...new Set(scopes.flat())];
}
export function suggestionsFor(lessonId:LessonId):Suggestion[]{
 if(lessonId==='ultrasonic-alert')return [...suggestionsFor('ldr-nightlight').filter(s=>s.label!=='analogRead'),{label:'delayMicroseconds',detail:'delayMicroseconds(us) · 0～10000 微秒，TRIG 至少 HIGH 10 微秒',template:'delayMicroseconds(${1:10});',type:'function'},{label:'pulseIn',detail:'pulseIn(34, HIGH, 30000) · 理想回波 μs；0 為逾時或無回波',template:'pulseIn(${1:34}, HIGH, ${2:30000})',type:'function'}];
 if(lessonId==='pir-delay')return [...suggestionsFor('ldr-nightlight').filter(s=>s.label!=='analogRead'),{label:'digitalRead',detail:'digitalRead(27) · PIR OUT，HIGH 表示活動',template:'digitalRead(${1:27})',type:'function'},{label:'millis',detail:'millis() · 虛擬毫秒，供延遲關燈比較',template:'millis()',type:'function'}];
 if(lessonId==='servo-angle')return [...lessonSuggestions.filter(s=>s.label==='delay'||s.label==='int'),{label:'Servo',detail:'全域宣告一個伺服物件；實板需 ESP32Servo',template:'Servo ${1:arm};',type:'class'},{label:'arm.attach',detail:'伺服物件.attach(23) · 啟用 GPIO23 訊號',template:'arm.attach(${1:23});',type:'function'},{label:'arm.write',detail:'伺服物件.write(angle) · 角度 0～180，不是微秒',template:'arm.write(${1:90});',type:'function'}];
 if(lessonId==='ldr-nightlight')return [...lessonSuggestions,{label:'analogRead',detail:'analogRead(34) · 暗時低、亮時高的理想光照 ADC',template:'analogRead(${1:34})',type:'function'},{label:'INPUT',detail:'GPIO34 ADC 輸入',template:'INPUT',type:'constant'},{label:'if',detail:'比較光照門檻，最多四層 if',template:'if (${1:light} < ${2:1500}) {\n  ${3}\n}',type:'keyword'}];
 if(lessonId==='rgb-mixing')return suggestionsFor('pwm-breathing').map(item=>item.label==='analogWrite'?{...item,detail:'analogWrite(pin, duty) · 紅23／綠22／藍21 各 0～255'}:item);
 if(lessonId==='pot-dimming')return [...suggestionsFor('pwm-breathing'),{label:'analogRead',detail:'analogRead(34) · 理想 12 位元 ADC，0～4095',template:'analogRead(${1:34})',type:'function'},{label:'INPUT',detail:'GPIO34 輸入模式；不支援內部上拉',template:'INPUT',type:'constant'}];
 if(lessonId==='pwm-breathing')return [...lessonSuggestions,{label:'analogWrite',detail:'analogWrite(23, duty) · 8 位元 PWM，0～255，預設 1000 Hz',template:'analogWrite(${1:23}, ${2:128});',type:'function'},{label:'if',detail:'最多四層 if／else，單一整數比較',template:'if (${1:brightness} >= ${2:255}) {\n  ${3}\n}',type:'keyword'},{label:'millis',detail:'目前虛擬毫秒',template:'millis()',type:'function'}];
 if(hasStatefulButton(lessonId))return [...suggestionsFor('button-led').map(item=>item.label==='if'?{...item,detail:'單一比較 == != > < >= <=；最多四層 if'}:item.label==='digitalWrite'?{...item,detail:'digitalWrite(pin, HIGH/LOW 或 0／1 變數)'}:item),{label:'millis',detail:'millis() · 取得目前虛擬毫秒，暫停時不增加',template:'millis()',type:'function'}];
 if(lessonId==='traffic-light')return lessonSuggestions.map(item=>item.label==='pinMode'||item.label==='digitalWrite'?{...item,detail:item.detail+' · 紅 GPIO23／黃 GPIO22／綠 GPIO21'}:item);
 if(lessonId==='dual-led')return lessonSuggestions.map(item=>item.label==='pinMode'||item.label==='digitalWrite'?{...item,detail:item.detail+' · 可用 GPIO23／GPIO22'}:item);
 if(lessonId==='blink')return lessonSuggestions;
 return [...lessonSuggestions.map(item=>item.label==='pinMode'?{...item,detail:'GPIO23 OUTPUT／GPIO18 INPUT_PULLUP',template:'pinMode(${1:18}, ${2:INPUT_PULLUP});'}:item),
 {label:'digitalRead',detail:'digitalRead(pin) · 用於 int 初始值或 if 比較',template:'digitalRead(${1:18})',type:'function'},
 {label:'INPUT_PULLUP',detail:'內建上拉輸入，按下為 LOW',template:'INPUT_PULLUP',type:'constant'},
 {label:'if',detail:'if (比較) { … } else { … } · 單一條件分支',template:'if (${1:buttonState} == ${2:LOW}) {\n  ${3}\n} else {\n  ${4}\n}',type:'keyword'}];
}
export function scaffoldFor(lessonId:LessonId){return lessonId==='ultrasonic-alert'?`void setup() {\n  // 設定 LED、TRIG 輸出與 Echo 輸入\n}\n\nvoid loop() {\n  // 觸發脈波、讀取回波、判斷距離並安排等待\n}\n`:lessonId==='pir-delay'?`// 在函式外保存最後活動時間\nvoid setup() {\n  // 設定 PIR 輸入與 LED 輸出\n}\n\nvoid loop() {\n  // 讀取活動、更新時間、判斷延遲並等待\n}\n`:lessonId==='servo-angle'?`// 在函式外宣告 Servo 物件\nvoid setup() {\n  // attach 指定訊號腳\n}\n\nvoid loop() {\n  // write 角度並安排等待\n}\n`:lessonId==='ldr-nightlight'?`void setup() {\n  // 設定 ADC 輸入與 LED 輸出\n}\n\nvoid loop() {\n  // 讀取光照，依門檻開關燈並安排等待\n}\n`:lessonId==='rgb-mixing'?`void setup() {\n  // 設定紅、綠、藍三個輸出\n}\n\nvoid loop() {\n  // 分別輸出三色 PWM 並安排等待\n}\n`:lessonId==='pot-dimming'?`void setup() {\n  // 設定 GPIO34 INPUT 與 GPIO23 OUTPUT\n}\n\nvoid loop() {\n  // 讀取電位器、轉換亮度、輸出 PWM 並等待\n}\n`:lessonId==='pwm-breathing'?`// 在函式外宣告亮度與步長\nvoid setup() {\n  // 設定 GPIO23 輸出\n}\n\nvoid loop() {\n  // 輸出 PWM、更新亮度、處理端點並等待\n}\n`:hasStatefulButton(lessonId)?`// 在函式外宣告需要保留的整數狀態\nvoid setup() {\n  // 設定 LED 輸出與按鈕上拉\n}\n\nvoid loop() {\n  // 讀取按鈕、檢查穩定時間，再更新狀態\n  // 安排正值等待\n}\n`:lessonId==='traffic-light'?programScaffold:lessonId==='dual-led'?dualScaffold:lessonId==='blink'?programScaffold:buttonScaffold;}
const buttonScaffold=`void setup() {
  // 設定 LED 輸出與按鈕內建上拉
}

void loop() {
  // 讀取按鈕，用條件控制 LED，並安排等待
}
`;

export const programScaffold=`void setup() {
  // 在這裡設定接腳模式
}

void loop() {
  // 在這裡練習控制 LED，並安排等待時間
}
`;

const dualScaffold=`void setup() {
  // 分別設定兩個 LED 接腳為輸出
}

void loop() {
  // 設定兩顆 LED 狀態、等待，再交換狀態並等待
}
`;

export function servoSuggestions(source:string){const clean=source.replace(/\/\*[\s\S]*?(?:\*\/|$)|\/\/[^\n]*/g,' ');const name=clean.match(/\bServo\s+([A-Za-z_]\w*)\s*;/)?.[1]??'arm';return suggestionsFor('servo-angle').map(s=>({...s,label:s.label.replace(/^arm\./,name+'.'),template:s.template.replace(/^arm\./,name+'.')}));}
