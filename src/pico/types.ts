import {advancedTitles,type AdvancedId} from './advancedLessons.ts';
import type {AdvancedSnapshot} from './advancedEngine.ts';
import type {CircuitWire} from '../circuit.ts';
export type PicoLessonId='blink'|'external-led'|'button-led'|'pwm-breathing'|'pot-dimming'|'ldr-nightlight'|'pir-led'|'button-toggle'|AdvancedId;
export const picoTitles:Record<PicoLessonId,string>={...advancedTitles,blink:'板載 LED 閃爍','external-led':'外接 LED 閃爍','button-led':'按鈕控制 LED','pwm-breathing':'PWM 呼吸燈','pot-dimming':'電位器調光','ldr-nightlight':'光敏電阻夜燈','pir-led':'PIR 人體移動感測燈','button-toggle':'按一次切換 LED'};
export function isPicoLesson(value:unknown):value is PicoLessonId{return typeof value==='string'&&Object.hasOwn(picoTitles,value);}
export function readPicoLesson(value:unknown):PicoLessonId{return isPicoLesson(value)?value:'blink';}
export interface PicoView {lit:boolean;external?:{id:Exclude<PicoLessonId,'blink'>;wires:CircuitWire[];pending:string|null;pressed:boolean;playing:boolean;flowWires:string[];flowDirections?:Record<string,boolean>;brightness?:number;potPosition?:number;duty?:number;advanced?:AdvancedSnapshot}}

export function hasPicoPWM(id:PicoLessonId){return id==='pwm-breathing'||id==='pot-dimming';}
export function hasPicoButton(id:PicoLessonId){return id==='button-led'||id==='button-toggle'||id==='button-counter'||id==='buzzer-doorbell';}
export function hasPicoDigitalInput(id:PicoLessonId){return hasPicoButton(id)||id==='pir-led'||id==='pir-delay';}
export function hasPicoADC(id:PicoLessonId){return id==='pot-dimming'||id==='ldr-nightlight';}
export function adcToU16(raw:number){if(!Number.isInteger(raw)||raw<0||raw>4095)throw new RangeError('ADC原始值須為0～4095整數。');return (raw<<4)|(raw>>8);}
