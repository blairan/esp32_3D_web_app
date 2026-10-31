import type {PythonSnapshot} from './language.ts';
export type PythonStatus='idle'|'starting'|'running'|'paused'|'stopped'|'error';
export interface PythonState extends PythonSnapshot {status:PythonStatus;diagnostic:{message:string;line:number;column:number}|null}
export const initialPythonState:PythonState={status:'idle',timeMs:0,lit:false,line:0,operations:0,cycles:0,diagnostic:null};
export type PythonCommand={type:'start';source:string}|{type:'pause'|'resume'|'stop'|'reset'};
