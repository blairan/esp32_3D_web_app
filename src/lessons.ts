export type LessonId='blink'|'button-led'|'dual-led'|'traffic-light'|'button-toggle'|'button-counter'|'buzzer-doorbell'|'pwm-breathing'|'rgb-mixing'|'pot-dimming'|'ldr-nightlight'|'servo-angle'|'ultrasonic-alert'|'pir-delay';
const ledParts={'resistor:a':'電阻 A 端','resistor:b':'電阻 B 端','led:a':'LED 正極 A+','led:k':'LED 負極 K−'};
export const lessons={
 blink:{id:'blink',title:'LED 閃爍',source:'J3-02',outputGPIO:23,outputGPIOs:[23],inputGPIO:null,inputPin:null,parts:ledParts},
 'button-led':{id:'button-led',title:'按鈕控制 LED',source:'J3-02',outputGPIO:23,outputGPIOs:[23],inputGPIO:18,inputPin:'J3-09',parts:{...ledParts,'button:a1':'按鈕 A1','button:a2':'按鈕 A2','button:b1':'按鈕 B1','button:b2':'按鈕 B2'}},
 'dual-led':{id:'dual-led',title:'雙 LED 交替閃爍',source:'J3-02',outputGPIO:23,outputGPIOs:[23,22],inputGPIO:null,inputPin:null,parts:{...ledParts,'resistor:a':'電阻 1 A 端','resistor:b':'電阻 1 B 端','led:a':'LED 1 正極 A+','led:k':'LED 1 負極 K−','resistor2:a':'電阻 2 A 端','resistor2:b':'電阻 2 B 端','led2:a':'LED 2 正極 A+','led2:k':'LED 2 負極 K−'}},
 'traffic-light':{id:'traffic-light',title:'紅黃綠交通號誌',source:'J3-02',outputGPIO:23,outputGPIOs:[23,22,21],inputGPIO:null,inputPin:null,parts:{...ledParts,'led:a':'紅燈 正極 A+','led:k':'紅燈 負極 K−','resistor2:a':'黃燈電阻 A 端','resistor2:b':'黃燈電阻 B 端','led2:a':'黃燈 正極 A+','led2:k':'黃燈 負極 K−','resistor3:a':'綠燈電阻 A 端','resistor3:b':'綠燈電阻 B 端','led3:a':'綠燈 正極 A+','led3:k':'綠燈 負極 K−'}},
 'button-toggle':{id:'button-toggle',title:'按一次切換 LED',source:'J3-02',outputGPIO:23,outputGPIOs:[23],inputGPIO:18,inputPin:'J3-09',parts:{...ledParts,'button:a1':'按鈕 A1','button:a2':'按鈕 A2','button:b1':'按鈕 B1','button:b2':'按鈕 B2'}},
 'button-counter':{id:'button-counter',title:'按鈕計數器',source:'J3-02',outputGPIO:23,outputGPIOs:[23],inputGPIO:18,inputPin:'J3-09',parts:{...ledParts,'button:a1':'按鈕 A1','button:a2':'按鈕 A2','button:b1':'按鈕 B1','button:b2':'按鈕 B2'}},
 'buzzer-doorbell':{id:'buzzer-doorbell',title:'主動式蜂鳴器門鈴',source:'J3-02',outputGPIO:23,outputGPIOs:[23],inputGPIO:18,inputPin:'J3-09',parts:{'buzzer:s':'蜂鳴器 S 訊號','buzzer:vcc':'蜂鳴器 VCC','buzzer:gnd':'蜂鳴器 GND','button:a1':'按鈕 A1','button:a2':'按鈕 A2','button:b1':'按鈕 B1','button:b2':'按鈕 B2'}},
 'pwm-breathing':{id:'pwm-breathing',title:'PWM 呼吸燈',source:'J3-02',outputGPIO:23,outputGPIOs:[23],inputGPIO:null,inputPin:null,parts:ledParts},
 'rgb-mixing':{id:'rgb-mixing',title:'RGB 混色',source:'J3-02',outputGPIO:23,outputGPIOs:[23,22,21],inputGPIO:null,inputPin:null,parts:{'resistor:a':'紅色電阻 A 端','resistor:b':'紅色電阻 B 端','resistor2:a':'綠色電阻 A 端','resistor2:b':'綠色電阻 B 端','resistor3:a':'藍色電阻 A 端','resistor3:b':'藍色電阻 B 端','rgb:r':'RGB 紅色 R','rgb:g':'RGB 綠色 G','rgb:b':'RGB 藍色 B','rgb:k':'RGB 共陰極 K−'}},
 'pot-dimming':{id:'pot-dimming',title:'電位器調光',source:'J3-02',outputGPIO:23,outputGPIOs:[23],inputGPIO:34,inputPin:'J2-05',parts:{...ledParts,'pot:vcc':'電位器 VCC','pot:w':'電位器滑動端 W','pot:gnd':'電位器 GND'}},
 'ldr-nightlight':{id:'ldr-nightlight',title:'光敏電阻夜燈',source:'J3-02',outputGPIO:23,outputGPIOs:[23],inputGPIO:34,inputPin:'J2-05',parts:{...ledParts,'ldr:a':'光敏電阻 A','ldr:b':'光敏電阻 B','divider:a':'10 kΩ 電阻 A','divider:b':'10 kΩ 電阻 B'}},
 'servo-angle':{id:'servo-angle',title:'伺服馬達角度控制',source:'J3-02',outputGPIO:23,outputGPIOs:[23],inputGPIO:null,inputPin:null,parts:{'servo:s':'伺服 SIG 訊號','servo:vcc':'伺服 VCC','servo:gnd':'伺服 GND','supply:plus':'外部 5V 正極','supply:minus':'外部電源 GND'}},
 'ultrasonic-alert':{id:'ultrasonic-alert',title:'超音波測距警示',source:'J3-02',outputGPIO:23,outputGPIOs:[23,22],inputGPIO:34,inputPin:'J2-05',parts:{...ledParts,'ultra:vcc':'超音波 VCC','ultra:gnd':'超音波 GND','ultra:trig':'超音波 TRIG','ultra:echo':'超音波 ECHO（5V）','echo1:a':'1 kΩ 電阻 A','echo1:b':'1 kΩ 電阻 B','echo2:a':'2 kΩ 電阻 A','echo2:b':'2 kΩ 電阻 B','supply:plus':'外部 5V 正極','supply:minus':'外部電源 GND'}},
 'pir-delay':{id:'pir-delay',title:'PIR 人體感測延遲燈',source:'J3-02',outputGPIO:23,outputGPIOs:[23],inputGPIO:27,inputPin:'J2-11',parts:{...ledParts,'pir:vcc':'PIR VCC（5V）','pir:gnd':'PIR GND','pir:out':'PIR OUT（3.3V）','supply:plus':'外部 5V 正極','supply:minus':'外部電源 GND'}},
} satisfies Record<LessonId,{id:LessonId;title:string;source:string;outputGPIO:number;outputGPIOs:number[];inputGPIO:number|null;inputPin:string|null;parts:Record<string,string>}>;
export function readLesson(value:string|null):LessonId{return value==='button-led'||value==='dual-led'||value==='traffic-light'||value==='button-toggle'||value==='button-counter'||value==='buzzer-doorbell'||value==='pwm-breathing'||value==='rgb-mixing'||value==='pot-dimming'||value==='ldr-nightlight'||value==='servo-angle'||value==='ultrasonic-alert'||value==='pir-delay'?value:'blink';}

export function hasButton(id:LessonId){return lessons[id].inputGPIO===18;}
export function hasStatefulButton(id:LessonId){return id==='button-toggle'||id==='button-counter';}

export function hasExtendedSyntax(id:LessonId){return hasStatefulButton(id)||id==='pwm-breathing'||id==='rgb-mixing'||id==='pot-dimming'||id==='ldr-nightlight'||id==='servo-angle'||id==='ultrasonic-alert'||id==='pir-delay';}

export function hasPWM(id:LessonId){return id==='pwm-breathing'||id==='rgb-mixing'||id==='pot-dimming';}

export function hasADC(id:LessonId){return id==='pot-dimming'||id==='ldr-nightlight';}

export function hasDigitalRead(id:LessonId){return hasButton(id)||id==='pir-delay';}
export function hasInputMode(id:LessonId){return hasADC(id)||id==='pir-delay'||id==='ultrasonic-alert';}
