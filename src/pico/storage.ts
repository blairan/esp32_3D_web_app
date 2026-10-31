import {isPicoLesson,type PicoLessonId} from './types.ts';
import {picoPins} from './board.ts';
import {partsFor} from './circuit.ts';
import type {CircuitWire} from '../circuit.ts';
export const picoDraftKey='interactive-lab-pico2w-micropython-v1';
export function picoKey(id:PicoLessonId){return id==='blink'?picoDraftKey:`${picoDraftKey}:${id}`;}
export interface PicoDraft {format:'pico-micropython-practice';version:1;boardId:'pico-2-w';lessonId:PicoLessonId;source:string;wires:CircuitWire[];backup:CircuitWire[]|null;savedAt:string}
export function parsePicoDraft(text:string):PicoDraft {
 if(new TextEncoder().encode(text).length>128*1024)throw new Error('練習檔超過128KB。');
 let v:Partial<PicoDraft>;try{v=JSON.parse(text);}catch{throw new Error('不是有效的 JSON 練習檔。');}
 if(!v||v.format!=='pico-micropython-practice'||v.version!==1||v.boardId!=='pico-2-w'||!isPicoLesson(v.lessonId)||typeof v.source!=='string'||v.source.length>12000||v.source.split('\n').length>400||typeof v.savedAt!=='string'||v.savedAt.length>40||!Number.isFinite(Date.parse(v.savedAt)))throw new Error('檔案格式、板型或課程不符，請使用 Pico MicroPython 練習備份。');
 const allowed=new Set([...picoPins.map(p=>p.pinId),...Object.keys(partsFor(v.lessonId))]);
 const readWires=(value:unknown):CircuitWire[]=>{if(!Array.isArray(value)||value.length>12||v.lessonId==='blink'&&value.length>0)throw new Error('此課接線資料無效或超過12條。');const ids=new Set(),pairs=new Set();return value.map(w=>{if(!w||typeof w.id!=='string'||!w.id||w.id.length>120||ids.has(w.id)||typeof w.from!=='string'||typeof w.to!=='string'||!allowed.has(w.from)||!allowed.has(w.to)||w.from===w.to)throw new Error('接線包含未知端點、自連或重複編號。');const pair=[w.from,w.to].sort().join('|');if(pairs.has(pair))throw new Error('接線包含重複導線。');ids.add(w.id);pairs.add(pair);return {id:w.id,from:w.from,to:w.to};});};
 return {format:v.format,version:v.version,boardId:v.boardId,lessonId:v.lessonId,source:v.source,wires:readWires(v.wires??[]),backup:v.backup==null?null:readWires(v.backup),savedAt:v.savedAt};
}
export function makePicoDraft(source:string,lessonId:PicoLessonId='blink',wires:CircuitWire[]=[],backup:CircuitWire[]|null=null):PicoDraft {return {format:'pico-micropython-practice',version:1,boardId:'pico-2-w',lessonId,source,wires,backup,savedAt:new Date().toISOString()};}
export function savePicoDraft(draft:PicoDraft){const clean=parsePicoDraft(JSON.stringify(draft));localStorage.setItem(picoKey(clean.lessonId),JSON.stringify(clean));try{localStorage.setItem('interactive-lab-last-board-v1','pico-2-w');localStorage.setItem('interactive-lab-pico-last-lesson-v1',clean.lessonId);}catch{/* Draft remains available even when the optional shortcut fails. */}}
export function lastPicoDraft():PicoDraft|null {try{const value=localStorage.getItem('interactive-lab-pico-last-lesson-v1'),id=isPicoLesson(value)?value:'blink';const draft=parsePicoDraft(localStorage.getItem(picoKey(id))??'');return draft.lessonId===id?draft:null;}catch{return null;}}
export function downloadText(filename:string,text:string,type='text/plain;charset=utf-8'){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
