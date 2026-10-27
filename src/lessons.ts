export type LessonId='blink'|'button-led';
const ledParts={'resistor:a':'電阻 A 端','resistor:b':'電阻 B 端','led:a':'LED 正極 A+','led:k':'LED 負極 K−'};
export const lessons={
 blink:{id:'blink',title:'LED 閃爍',source:'J3-02',outputGPIO:23,inputGPIO:null,inputPin:null,parts:ledParts},
 'button-led':{id:'button-led',title:'按鈕控制 LED',source:'J3-02',outputGPIO:23,inputGPIO:18,inputPin:'J3-09',parts:{...ledParts,'button:a1':'按鈕 A1','button:a2':'按鈕 A2','button:b1':'按鈕 B1','button:b2':'按鈕 B2'}},
} satisfies Record<LessonId,{id:LessonId;title:string;source:string;outputGPIO:number;inputGPIO:number|null;inputPin:string|null;parts:Record<string,string>}>;
export function readLesson(value:string|null):LessonId{return value==='button-led'?'button-led':'blink';}
