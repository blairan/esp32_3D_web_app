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
};
