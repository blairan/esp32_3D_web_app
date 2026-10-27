import type {LessonId} from '../lessons';
import type {InputLevel} from './runtime';
import type { ProgramDiagnostic } from './language';
import type { ProgramSnapshot } from './runtime';
export type WorkerCommand={type:'start';source:string;revision:number;lessonId:LessonId;input:InputLevel}|{type:'pause';revision:number}|{type:'resume';revision:number;input:InputLevel}|{type:'input';revision:number;input:InputLevel};
export type WorkerEvent={type:'snapshot';snapshot:ProgramSnapshot;revision:number}|{type:'error';diagnostic:ProgramDiagnostic;revision:number};
