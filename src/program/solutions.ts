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
};
