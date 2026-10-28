export interface ClimateValue {temperature:number;humidity:number}
export interface DeviceInputs {climate:ClimateValue|null;oledWired:boolean}
export interface ClimateReading extends ClimateValue {timeMs:number}
export interface OledGlyph {text:string;x:number;y:number;size:number}
export interface OledState {begun:boolean;revision:number;glyphs:OledGlyph[]}
export function emptyPeripherals():{climate:ClimateReading|null;oled:OledState}{return {climate:null,oled:{begun:false,revision:0,glyphs:[]}};}
