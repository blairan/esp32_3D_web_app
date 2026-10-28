import type {LessonId} from '../lessons';
import type {InputLevel} from './runtime';
import type { ProgramDiagnostic } from './language';
import type { ProgramSnapshot } from './runtime';
export type WorkerCommand={type:'start';source:string;revision:number;lessonId:LessonId;input:InputLevel;analogInput?:number|null}|{type:'analog-input';revision:number;value:number|null}|{type:'pause';revision:number}|{type:'resume';revision:number;input:InputLevel;analogInput?:number|null}|{type:'input';revision:number;input:InputLevel;analogInput?:number|null};
export type WorkerEvent={type:'snapshot';snapshot:ProgramSnapshot;revision:number}|{type:'error';diagnostic:ProgramDiagnostic;revision:number};
