import {picoScaffold,picoAnswer} from './language.ts';
import type {PicoLessonId} from './types.ts';
import type {PicoArticleId} from './content.ts';
const externalBase='from machine import Pin\nimport time\n\nled = Pin(15, Pin.OUT)\n';
export const picoCourses:Record<PicoLessonId,{number:string;goal:string;hint:string;scaffold:string;answer:string;topic:PicoArticleId}>= {
 blink:{number:'01',goal:'自己完成亮1秒、滅1秒的循環。請取代 pass，保留4個空白縮排。',hint:'使用 LED 物件的 on()／off() 控制亮滅；每次改變後用 time.sleep() 等待。',scaffold:picoScaffold,answer:picoAnswer,topic:'intro'},
 'external-led':{number:'02',goal:'GP15（實體20）經220 Ω電阻與外接LED接地，自己完成亮1秒、滅1秒。',hint:'A+朝GPIO，K−朝GND，電阻需串聯；程式控制的是GP15，不是板載LED。',scaffold:externalBase+'\nwhile True:\n    # 完成外接 LED 的開燈、等待、關燈、等待\n    pass\n',answer:externalBase+'\nwhile True:\n    led.on()\n    time.sleep(1)\n    led.off()\n    time.sleep(1)\n',topic:'external'},
 'button-led':{number:'03',goal:'GP14（實體19）使用內建上拉讀按鈕；按下時開啟GP15外接LED，放開時熄滅。',hint:'按下接地讀0，放開由PULL_UP維持1。用if／else判斷，兩條路徑都需要等待，可放在分支之後。',scaffold:externalBase+'button = Pin(14, Pin.IN, Pin.PULL_UP)\n\nwhile True:\n    # 讀取按鈕、判斷輸出，並安排等待\n    pass\n',answer:externalBase+'button = Pin(14, Pin.IN, Pin.PULL_UP)\n\nwhile True:\n    if button.value() == 0:\n        led.on()\n    else:\n        led.off()\n    time.sleep_ms(20)\n',topic:'button'},
};
