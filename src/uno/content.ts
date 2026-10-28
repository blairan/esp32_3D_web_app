import {solutions} from '../program/solutions.ts';
import {loadExercise} from '../loadExercises.ts';
import {buttonExercise} from '../buttonExercises.ts';
import {unoText,lessonPins} from '../boards/lessonProfiles.ts';
import type {LessonId} from '../lessons.ts';
import type {ArticleId} from '../wiki/articles.ts';
export function unoCourse(id:LessonId){const exercise=loadExercise(id)??buttonExercise(id);const p=lessonPins('uno-r3',id);const topic:ArticleId=exercise?.topic??(id==='blink'?'setup-loop':id==='button-led'?'button-pullup':id==='dual-led'?'dual-led':'traffic-light');const goal=exercise?.goal??(id==='blink'?'D10 控制外接 LED，每次亮與滅各等待1000ms。':id==='button-led'?'D2 INPUT_PULLUP，按下 LOW 時使 D10 LED亮起，放開熄滅。':id==='dual-led'?'D10／D9 兩顆 LED 各自限流，輪流亮起，各維持1000ms。':'D10紅、D9黃、D6綠，紅3秒、綠3秒、黃1秒，每階段只亮一顆。');const hint=exercise?.hint??'先設定本課接腳，再安排輸出與正值 delay。';return {goal:unoText(goal,id),hint:unoText(hint,id),topic,pins:p};}
export function unoSolution(id:LessonId){const original=solutions[id];return {title:original.title+'（UNO R3）',code:unoText(original.code,id),notes:[
 '本程式適用 UNO R3 的指定教學接線。實板需檢查元件規格，模擬器不編譯任意 C/C++。',
 id==='servo-angle'?'使用外部5V與共地、D9訊號；實板使用 Arduino Servo 函式庫及 Servo.h。':id==='ultrasonic-alert'?'UNO 採5V邏輯，HC-SR04 Echo直接接D8，不使用ESP32版分壓；TRIG D7。':id==='pot-dimming'?'A0 讀值0～1023，整數除以4轉成0～255 PWM。':id==='ldr-nightlight'?'A0 小於375開燈、大於550關燈，中間保留狀態。':id==='seven-counter'?'TM1637 CLK D7／DIO D8、0～9999，每秒加一，到上限回零。':id==='oled-i2c'||id==='environment-lab'?'UNO 使用 Wire.begin()，固定 SDA A4／SCL A5；OLED 模型須為5V邏輯相容並具所需電位轉換的模組。':id==='climate-dht'?'DHT22 DATA D4、5V上拉模組。兩讀取方法共用2000ms快取；實板需DHT.h並檢查NaN。':'各LED使用獨立220Ω電阻，程式控制輸出；查看答案不會覆蓋或執行程式。',
 '沿用受限32位元整數教學，不模擬AVR的16位元int、溢位、中斷、計時器或完整CPU。',
 ]};}
