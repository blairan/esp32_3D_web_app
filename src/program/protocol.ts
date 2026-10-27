import type { ProgramDiagnostic } from './language';
import type { ProgramSnapshot } from './runtime';
export type WorkerCommand={type:'start';source:string;revision:number}|{type:'pause';revision:number}|{type:'resume';revision:number};
export type WorkerEvent={type:'snapshot';snapshot:ProgramSnapshot;revision:number}|{type:'error';diagnostic:ProgramDiagnostic;revision:number};
