import {lessons,hasButton,type LessonId} from '../lessons.ts';
import type {BoardId} from './types.ts';
import {unoPin} from './registry.ts';
export function nativePin(boardId:BoardId,id:LessonId,pin:number):number{
 if(boardId!=='uno-r3')return pin;
 if(pin===23)return id==='servo-angle'?9:10;
 if(id==='ultrasonic-alert')return pin===22?7:pin===34?8:pin;
 if(id==='seven-counter')return pin===22?7:pin===21?8:pin;
 if(id==='oled-i2c'||id==='environment-lab'){if(pin===21)return 18;if(pin===22)return 19;}
 return ({22:9,21:6,18:2,34:14,27:2} as Record<number,number>)[pin]??pin;
}
export function lessonPins(boardId:BoardId,id:LessonId){const lesson=lessons[id],map=(pin:number)=>nativePin(boardId,id,pin);return {primary:map(lesson.outputGPIO),outputs:lesson.outputGPIOs.map(map),input:lesson.inputGPIO===null?null:map(lesson.inputGPIO),button:hasButton(id),adc:map(34),trig:map(22),sda:boardId==='uno-r3'?18:21,scl:boardId==='uno-r3'?19:22};}
/** Source/material adaptation only. Executed programs keep native board numbers throughout. */
export function unoText(text:string,id:LessonId):string{
 let s=text.replace(/\b(23|22|21|18|34|27)\b/g,n=>String(nativePin('uno-r3',id,Number(n))));
 s=s.replace(/GPIO\s*(\d+)/g,(_,n)=>Number(n)>=14?'A'+(Number(n)-14):'D'+n).replace(/3V3|3\.3V|3\.3 V/g,'5V').replace(/4095/g,'1023').replace(/2048/g,'512').replace(/3072/g,'768').replace(/1500/g,id==='ldr-nightlight'?'375':'1500').replace(/2200/g,id==='ldr-nightlight'?'550':'2200').replace(/reading \/ 16/g,'reading / 4').replace(/Wire\.begin\([^)]*\)/g,'Wire.begin()').replace(/ESP32Servo/g,'Servo');
 if(id==='pot-dimming'||id==='ldr-nightlight')s=s.replace(/\b14\b/g,'A0');
 return s;
}
export function unoLesson(id:LessonId){const p=lessonPins('uno-r3',id),original=lessons[id];const parts:Record<string,string>=Object.fromEntries(Object.entries(original.parts).filter(([key])=>id!=='ultrasonic-alert'||!key.startsWith('echo')).map(([key,label])=>[key,label.replace(/3V3|3\.3V/g,'5V')]));if(id==='pir-delay')parts['pir:out']='PIR OUT（3.3V 邏輯）';return {...original,...p,parts,source:unoPin(p.primary)};}
