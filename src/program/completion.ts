import type {LessonId} from '../lessons.ts';
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
export function suggestionsFor(lessonId:LessonId){
 if(lessonId==='blink')return lessonSuggestions;
 return [...lessonSuggestions.map(item=>item.label==='pinMode'?{...item,detail:'GPIO23 OUTPUT／GPIO18 INPUT_PULLUP',template:'pinMode(${1:18}, ${2:INPUT_PULLUP});'}:item),
 {label:'digitalRead',detail:'digitalRead(pin) · 用於 int 初始值或 if 比較',template:'digitalRead(${1:18})',type:'function'},
 {label:'INPUT_PULLUP',detail:'內建上拉輸入，按下為 LOW',template:'INPUT_PULLUP',type:'constant'},
 {label:'if',detail:'if (比較) { … } else { … } · 單一條件分支',template:'if (${1:buttonState} == ${2:LOW}) {\n  ${3}\n} else {\n  ${4}\n}',type:'keyword'}];
}
export function scaffoldFor(lessonId:LessonId){return lessonId==='blink'?programScaffold:buttonScaffold;}
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
