import {useWiki} from '../wiki/WikiProvider';
import {topicArticles} from '../wiki/articles';
import type {ButtonAnalysis} from '../circuit';
import type {InputLevel} from '../program/runtime';
export interface ButtonControlProps {pressed:boolean;held:boolean;onSource:(source:string,down:boolean)=>void;onHeld:(held:boolean)=>void;input:ButtonAnalysis;lastRead?:InputLevel;inputEnabled?:boolean}
export default function ButtonControl({pressed,held,onSource,onHeld,input,lastRead=null,inputEnabled=false}:ButtonControlProps){
 const wiki=useWiki();
 return <section className="button-control" aria-label="虛擬按鈕與 GPIO18 輸入"><div className="button-control-heading"><strong>GPIO18 · 按鈕輸入</strong><span>INPUT_PULLUP</span></div>
 <div className="button-control-actions"><button type="button" className={`press-button${pressed?' pressed':''}`} aria-label="按住虛擬按鈕" aria-pressed={pressed}
 onPointerDown={event=>{if(event.button!==0)return;event.currentTarget.setPointerCapture(event.pointerId);onSource('control-pointer',true);}}
 onPointerMove={event=>{const box=event.currentTarget.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)onSource('control-pointer',false);}}
 onPointerUp={()=>onSource('control-pointer',false)} onPointerCancel={()=>onSource('control-pointer',false)} onLostPointerCapture={()=>onSource('control-pointer',false)} onPointerLeave={()=>onSource('control-pointer',false)}
 onKeyDown={event=>{if(event.key===' '||event.key==='Enter'){event.preventDefault();onSource('control-key',true);}}} onKeyUp={event=>{if(event.key===' '||event.key==='Enter'){event.preventDefault();onSource('control-key',false);}}}
 onBlur={()=>{onSource('control-key',false);onSource('control-pointer',false);}} onClick={event=>event.preventDefault()}>{pressed?'按鈕已按下':'按住按鈕'}</button>
 <label className="hold-button"><input type="checkbox" checked={held} onChange={event=>onHeld(event.target.checked)}/>保持按下</label></div>
 <div className="input-readout"><span data-button-pressed={String(pressed)}>按鈕：{pressed?'按下':'放開'}</span><span>即時電位 <b data-input-level={input.level??'invalid'}>{input.level??'無法判定'}</b></span><span>上次讀值 <b data-last-read={lastRead??'none'}>{lastRead??'尚未讀取'}</b></span></div>
 <p>{inputEnabled?'上拉已設定。':'執行前請自行設定 INPUT_PULLUP。'} 按鈕不直接控制 LED；程式下一次 digitalRead 才讀取輸入，暫停時輸出與時間保持。</p>
 <div className={`input-feedback ${input.code}`} data-input-code={input.code}><strong>{input.title}</strong><p>{input.description}</p></div>
 <button type="button" className="wiki-link" onClick={event=>wiki(topicArticles.button,event.currentTarget)}>為什麼按下是 LOW？</button></section>;
}
