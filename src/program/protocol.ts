import type {BoardId} from '../boards/types';
import type {DeviceInputs} from './peripheralTypes';
import type {LessonId} from '../lessons';
import type {InputLevel} from './runtime';
import type { ProgramDiagnostic } from './language';
import type { ProgramSnapshot } from './runtime';
export type WorkerCommand={type:'start';boardId?:BoardId;source:string;revision:number;lessonId:LessonId;input:InputLevel;analogInput?:number|null;distanceCm?:number|null;devices?:DeviceInputs}|{type:'analog-input';revision:number;value:number|null}|{type:'distance';revision:number;value:number|null}|{type:'devices';revision:number;value:DeviceInputs}|{type:'pause';revision:number}|{type:'resume';revision:number;input:InputLevel;analogInput?:number|null;distanceCm?:number|null;devices?:DeviceInputs}|{type:'input';revision:number;input:InputLevel;analogInput?:number|null;distanceCm?:number|null;devices?:DeviceInputs};
export type WorkerEvent={type:'snapshot';snapshot:ProgramSnapshot;revision:number}|{type:'error';diagnostic:ProgramDiagnostic;revision:number};
