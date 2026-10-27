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
 const functions=[...clean.matchAll(/\bvoid\s+(?:setup|loop)\s*\(\s*\)\s*\{/g)];
 const last=functions.at(-1);const scope=functions.length?clean.slice(0,functions[0].index)+(last&&!clean.slice(last.index).includes('}')?clean.slice(last.index):''):clean;
 return [...new Set(Array.from(scope.matchAll(/\bint\s+([A-Za-z_]\w*)\s*=[^;{}]*;/g),match=>match[1]))];
}

export const programScaffold=`void setup() {
  // 在這裡設定接腳模式
}

void loop() {
  // 在這裡練習控制 LED，並安排等待時間
}
`;
