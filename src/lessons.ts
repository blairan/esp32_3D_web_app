export type LessonId='blink'|'button-led'|'dual-led'|'traffic-light'|'button-toggle'|'button-counter';
const ledParts={'resistor:a':'電阻 A 端','resistor:b':'電阻 B 端','led:a':'LED 正極 A+','led:k':'LED 負極 K−'};
export const lessons={
 blink:{id:'blink',title:'LED 閃爍',source:'J3-02',outputGPIO:23,outputGPIOs:[23],inputGPIO:null,inputPin:null,parts:ledParts},
 'button-led':{id:'button-led',title:'按鈕控制 LED',source:'J3-02',outputGPIO:23,outputGPIOs:[23],inputGPIO:18,inputPin:'J3-09',parts:{...ledParts,'button:a1':'按鈕 A1','button:a2':'按鈕 A2','button:b1':'按鈕 B1','button:b2':'按鈕 B2'}},
 'dual-led':{id:'dual-led',title:'雙 LED 交替閃爍',source:'J3-02',outputGPIO:23,outputGPIOs:[23,22],inputGPIO:null,inputPin:null,parts:{...ledParts,'resistor:a':'電阻 1 A 端','resistor:b':'電阻 1 B 端','led:a':'LED 1 正極 A+','led:k':'LED 1 負極 K−','resistor2:a':'電阻 2 A 端','resistor2:b':'電阻 2 B 端','led2:a':'LED 2 正極 A+','led2:k':'LED 2 負極 K−'}},
 'traffic-light':{id:'traffic-light',title:'紅黃綠交通號誌',source:'J3-02',outputGPIO:23,outputGPIOs:[23,22,21],inputGPIO:null,inputPin:null,parts:{...ledParts,'led:a':'紅燈 正極 A+','led:k':'紅燈 負極 K−','resistor2:a':'黃燈電阻 A 端','resistor2:b':'黃燈電阻 B 端','led2:a':'黃燈 正極 A+','led2:k':'黃燈 負極 K−','resistor3:a':'綠燈電阻 A 端','resistor3:b':'綠燈電阻 B 端','led3:a':'綠燈 正極 A+','led3:k':'綠燈 負極 K−'}},
 'button-toggle':{id:'button-toggle',title:'按一次切換 LED',source:'J3-02',outputGPIO:23,outputGPIOs:[23],inputGPIO:18,inputPin:'J3-09',parts:{...ledParts,'button:a1':'按鈕 A1','button:a2':'按鈕 A2','button:b1':'按鈕 B1','button:b2':'按鈕 B2'}},
 'button-counter':{id:'button-counter',title:'按鈕計數器',source:'J3-02',outputGPIO:23,outputGPIOs:[23],inputGPIO:18,inputPin:'J3-09',parts:{...ledParts,'button:a1':'按鈕 A1','button:a2':'按鈕 A2','button:b1':'按鈕 B1','button:b2':'按鈕 B2'}},
} satisfies Record<LessonId,{id:LessonId;title:string;source:string;outputGPIO:number;outputGPIOs:number[];inputGPIO:number|null;inputPin:string|null;parts:Record<string,string>}>;
export function readLesson(value:string|null):LessonId{return value==='button-led'||value==='dual-led'||value==='traffic-light'||value==='button-toggle'||value==='button-counter'?value:'blink';}

export function hasButton(id:LessonId){return lessons[id].inputGPIO!==null;}
export function hasStatefulButton(id:LessonId){return id==='button-toggle'||id==='button-counter';}
