export const picoDraftKey='interactive-lab-pico2w-micropython-v1';
export interface PicoDraft {format:'pico-micropython-practice';version:1;boardId:'pico-2-w';lessonId:'blink';source:string;savedAt:string}
export function parsePicoDraft(text:string):PicoDraft {
 if(new TextEncoder().encode(text).length>128*1024)throw new Error('練習檔超過128KB。');
 let v:Partial<PicoDraft>;try{v=JSON.parse(text);}catch{throw new Error('不是有效的 JSON 練習檔。');}
 if(!v||v.format!=='pico-micropython-practice'||v.version!==1||v.boardId!=='pico-2-w'||v.lessonId!=='blink'||typeof v.source!=='string'||v.source.length>12000||v.source.split('\n').length>400||typeof v.savedAt!=='string'||!Number.isFinite(Date.parse(v.savedAt)))throw new Error('檔案格式、板型或課程不符，請使用 Pico MicroPython 練習備份。');
 return {format:v.format,version:v.version,boardId:v.boardId,lessonId:v.lessonId,source:v.source,savedAt:v.savedAt};
}
export function makePicoDraft(source:string):PicoDraft {return {format:'pico-micropython-practice',version:1,boardId:'pico-2-w',lessonId:'blink',source,savedAt:new Date().toISOString()};}
export function downloadText(filename:string,text:string,type='text/plain;charset=utf-8'){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
