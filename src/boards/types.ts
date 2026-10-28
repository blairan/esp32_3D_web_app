export type BoardId='esp32'|'uno-r3';
export type PinCategory='gpio'|'input'|'power'|'ground'|'special'|'reserved';
export interface Pin {pinId:string;header:string;position:number;silkscreen:string;officialName:string;gpio:number|null;role:string;restrictions:string;category:PinCategory;x:number;y:number}
export interface BoardDefinition {id:string;key:BoardId;name:string;module:string;source:string;logicVoltage:number;adcMax:number;pwmPins:number[];pins:Pin[]}
