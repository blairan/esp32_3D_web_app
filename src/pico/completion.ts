import type {PicoLessonId} from './types.ts';
import type {PicoArticleId} from './content.ts';
export interface PythonCompletion {label:string;template:string;detail:string;topic:PicoArticleId}
export function pythonCompletions(source:string,id:PicoLessonId):PythonCompletion[]{
 const name=source.match(/^([A-Za-z_]\w*)\s*=\s*Pin\(\s*(?:["']LED["']|15)\s*,\s*Pin\.OUT\s*\)/m)?.[1]??'led',input=source.match(/^([A-Za-z_]\w*)\s*=\s*Pin\(\s*14\s*,\s*Pin\.IN\s*,\s*Pin\.PULL_UP\s*\)/m)?.[1]??'button';
 const topic:PicoArticleId=id==='blink'?'pin':'external';
 const options:PythonCompletion[]=[{label:'Pin',template:id==='blink'?'Pin("LED", Pin.OUT)':'Pin(15, Pin.OUT)',detail:id==='blink'?'建立板載 LED 輸出':'建立GP15（實體20）外接LED輸出',topic},{label:'while',template:'while True:\n\t${指令}',detail:'4空白縮排的重複區塊',topic:'intro'},...[['on','開啟 LED'],['off','關閉 LED'],['toggle','反轉 LED']].map<PythonCompletion>(([method,detail])=>({label:name+'.'+method,template:name+'.'+method+'()',detail,topic})),{label:name+'.value',template:name+'.value(${0})',detail:'設定輸出：0關、1開',topic},{label:'time.sleep',template:'time.sleep(${1})',detail:'等待秒數，可用小數秒',topic:'timing'},{label:'time.sleep_ms',template:'time.sleep_ms(${1000})',detail:'等待整數毫秒',topic:'timing'}];
 if(id==='button-led')options.push({label:input+'.value',template:input+'.value()',detail:'讀GP14：按下0，放開1',topic:'button'},{label:'if',template:`if ${input}.value() == \${0}:\n\t\${指令}\nelse:\n\t\${指令}`,detail:'按鈕條件；分支內8個空白',topic:'button'},{label:'Pin.IN',template:'Pin.IN, Pin.PULL_UP',detail:'輸入模式與內建上拉',topic:'button'});
 return options;
}
