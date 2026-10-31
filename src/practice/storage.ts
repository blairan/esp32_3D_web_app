import {boards,type BoardId} from '../boards/registry.ts';
import {lessons,type LessonId} from '../lessons.ts';
import {unoLesson} from '../boards/lessonProfiles.ts';
import type {CircuitWire} from '../circuit.ts';
export const maxFileBytes=128*1024;
export interface PracticeInputs {adc:number;light:number;temperature:number;humidity:number;distance:number;echo:boolean;motion:boolean;fault:boolean}
export interface Practice {format:'interactive-lab-practice';version:1;boardId:BoardId;lessonId:LessonId;source:string;wires:CircuitWire[];backup:CircuitWire[]|null;inputs:PracticeInputs;savedAt:string}
export const defaults=(board:BoardId):PracticeInputs=>({adc:board==='uno-r3'?512:2048,light:board==='uno-r3'?768:3072,temperature:25,humidity:60,distance:100,echo:true,motion:false,fault:false});
export function keyFor(board:BoardId,lesson:LessonId){return `interactive-lab-practice-v1:${board}:${lesson}`;}
function object(v:unknown):Record<string,unknown>{if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('練習檔內容不是有效物件。');return v as Record<string,unknown>;}
export function validatePractice(raw:unknown):Practice{
 const v=object(raw);if(v.format!=='interactive-lab-practice'||v.version!==1)throw new Error('不支援此檔案格式或版本。');
 if(v.boardId!=='esp32'&&v.boardId!=='uno-r3')throw new Error('未知的開發板。');
 if(typeof v.lessonId!=='string'||!Object.hasOwn(lessons,v.lessonId))throw new Error('未知的學習專題。');
 const boardId=v.boardId,lessonId=v.lessonId as LessonId;
 if(typeof v.source!=='string'||v.source.length>12000||v.source.split('\n').length>400)throw new Error('程式超過12000字元或400行。');
 const parts=boardId==='uno-r3'?unoLesson(lessonId).parts:lessons[lessonId].parts;
 const terminals=new Set([...boards[boardId].pins.map(p=>p.pinId),...Object.keys(parts)]);
 const wires=(raw:unknown):CircuitWire[]=>{if(!Array.isArray(raw)||raw.length>12)throw new Error('接線最多12條。');const ids=new Set<string>(),pairs=new Set<string>();return raw.map(item=>{const w=object(item);if(typeof w.id!=='string'||!w.id||w.id.length>120||ids.has(w.id)||typeof w.from!=='string'||typeof w.to!=='string'||!terminals.has(w.from)||!terminals.has(w.to)||w.from===w.to)throw new Error('接線含未知端點、重複編號或自連。');const number=w.id.match(/^wire-(\d+)$/)?.[1];if(number&&(!Number.isSafeInteger(Number(number))||Number(number)>Number.MAX_SAFE_INTEGER-1000))throw new Error('接線編號超出範圍。');const pair=[w.from,w.to].sort().join('|');if(pairs.has(pair))throw new Error('接線含重複導線。');ids.add(w.id);pairs.add(pair);return {id:w.id,from:w.from,to:w.to};});};
 const inputs=object(v.inputs),d=defaults(boardId),result={...d};
 for(const [name,min,max] of [['adc',0,boards[boardId].adcMax],['light',0,boards[boardId].adcMax],['temperature',-40,80],['humidity',0,100],['distance',2,400]] as const){const n=inputs[name];if(typeof n!=='number'||!Number.isInteger(n)||n<min||n>max)throw new Error('輸入設定超出本板型的有效範圍。');result[name]=n;}
 for(const name of ['echo','motion','fault'] as const){if(typeof inputs[name]!=='boolean')throw new Error('輸入開關設定無效。');result[name]=inputs[name];}
 if(typeof v.savedAt!=='string'||v.savedAt.length>40||!Number.isFinite(Date.parse(v.savedAt)))throw new Error('保存時間無效。');
 return {format:'interactive-lab-practice',version:1,boardId,lessonId,source:v.source,wires:wires(v.wires),backup:v.backup===null?null:wires(v.backup),inputs:result,savedAt:v.savedAt};
}
export function parsePractice(text:string){if(new TextEncoder().encode(text).length>maxFileBytes)throw new Error('練習檔超過128KB。');let raw:unknown;try{raw=JSON.parse(text);}catch{throw new Error('不是有效的JSON練習檔。');}return validatePractice(raw);}
export function readDraft(board:BoardId,lesson:LessonId):{draft:Practice|null;error:string|null}{try{const raw=localStorage.getItem(keyFor(board,lesson));if(!raw)return {draft:null,error:null};const draft=parsePractice(raw);if(draft.boardId!==board||draft.lessonId!==lesson)throw new Error('草稿的板型或專題不符。');return {draft,error:null};}catch(e){return {draft:null,error:e instanceof Error?e.message:'無法讀取本機草稿。'};}}
export function writeDraft(draft:Practice){const clean=validatePractice(draft);localStorage.setItem(keyFor(clean.boardId,clean.lessonId),JSON.stringify(clean));try{localStorage.setItem('interactive-lab-last-practice-v1',JSON.stringify({boardId:clean.boardId,lessonId:clean.lessonId}));}catch{/* The draft itself was saved; the shortcut is optional. */}}
// Import writes the destination explicitly; old page effects must not overwrite it while navigating.
let importing=false;
export function isImporting(){return importing;}
export function applyImport(draft:Practice,beforeNavigate:()=>void=()=>{}){writeDraft(draft);importing=true;beforeNavigate();const url=new URL(location.href);url.searchParams.set('board',draft.boardId);url.searchParams.set('lesson',draft.lessonId);url.searchParams.delete('practice-import');url.hash='code';if(url.href===location.href)location.reload();else location.assign(url.href);}

export function lastPractice(){try{const value=object(JSON.parse(localStorage.getItem('interactive-lab-last-practice-v1')??'null'));if((value.boardId==='esp32'||value.boardId==='uno-r3')&&typeof value.lessonId==='string'&&Object.hasOwn(lessons,value.lessonId))return readDraft(value.boardId,value.lessonId as LessonId).draft;return null;}catch{return null;}}

export function nextWireNumber(draft:Practice|null){return 1+[...(draft?.wires??[]),...(draft?.backup??[])].reduce((max,w)=>Math.max(max,Number(w.id.match(/^wire-(\d+)$/)?.[1]??0)),0);}
