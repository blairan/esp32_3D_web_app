import type {PicoLessonId} from './types.ts';
import type {PythonSnapshot} from './language.ts';
export type PythonStatus='idle'|'starting'|'running'|'paused'|'stopped'|'error';
export interface PythonState extends PythonSnapshot {status:PythonStatus;diagnostic:{message:string;line:number;column:number}|null}
export const initialPythonState:PythonState={status:'idle',timeMs:0,lit:false,line:0,operations:0,cycles:0,lastRead:null,diagnostic:null};
export type PythonCommand={type:'start';source:string;lessonId?:PicoLessonId;input?:0|1|null;valid?:boolean;message?:string}|{type:'input';input:0|1|null;valid:boolean;message:string}|{type:'pause'|'resume'|'stop'|'reset'};
