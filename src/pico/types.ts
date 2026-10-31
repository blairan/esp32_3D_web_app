import type {CircuitWire} from '../circuit.ts';
export type PicoLessonId='blink'|'external-led'|'button-led';
export const picoTitles:Record<PicoLessonId,string>={blink:'板載 LED 閃爍','external-led':'外接 LED 閃爍','button-led':'按鈕控制 LED'};
export function isPicoLesson(value:unknown):value is PicoLessonId{return typeof value==='string'&&Object.hasOwn(picoTitles,value);}
export function readPicoLesson(value:unknown):PicoLessonId{return isPicoLesson(value)?value:'blink';}
export interface PicoView {lit:boolean;external?:{id:Exclude<PicoLessonId,'blink'>;wires:CircuitWire[];pending:string|null;pressed:boolean;playing:boolean;flowWires:string[];flowDirections?:Record<string,boolean>}}
