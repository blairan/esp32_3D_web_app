import {useEffect,useRef,useState} from 'react';
import {buildHardwareSketch,type SketchInput} from '../hardware/exportSketch';
import {ProgramError} from '../program/language';
import {targets} from '../hardware/targets';
import {lessons} from '../lessons';
export default function ArduinoExport({input,onClose}:{input:SketchInput;onClose:()=>void}) {
 const dialog=useRef<HTMLDialogElement>(null);
 // Freeze the export snapshot on open; the editor and simulator keep their own state.
 const [preview]=useState(()=>{try{return {sketch:buildHardwareSketch(input),error:null};}catch(e){return {sketch:null,error:e instanceof ProgramError?`第 ${e.line} 行，第 ${e.column} 欄：${e.message}`:e instanceof Error?e.message:'無法產生程式，請檢查內容。'};}});
 useEffect(()=>{const el=dialog.current,previous=document.activeElement as HTMLElement|null;el?.showModal();const overflow=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{el?.close();document.body.style.overflow=overflow;previous?.focus();};},[]);
 const download=()=>{if(!preview.sketch)return;const url=URL.createObjectURL(new Blob([preview.sketch.code],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=preview.sketch.filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 const {sketch,error}=preview;
 return <dialog ref={dialog} className="arduino-export" aria-labelledby="arduino-export-title" onCancel={e=>{e.preventDefault();e.stopPropagation();onClose();}} onKeyDown={e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();onClose();}if(e.key==='Tab'){
   const items=Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], summary, [tabindex="0"]')??[]).filter(el=>el.getClientRects().length>0);
   const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
  }}}>
  <header><div><p>實板原始程式匯出</p><h2 id="arduino-export-title">Arduino 程式預覽</h2></div><button autoFocus onClick={onClose} aria-label="關閉 Arduino 匯出預覽">關閉</button></header>
  <div className="arduino-export-body">
   <p><strong>{targets[input.boardId].label}</strong> · {lessons[input.lessonId].title}</p>
   <p>這是目前自己寫的程式；原草稿、接線、視角及執行狀態不會被匯出操作更改。瀏覽器未編譯這份程式。</p>
   {error?<div role="alert" className="arduino-export-error"><h3>暫時無法匯出</h3><p>{error}</p><p>請關閉預覽，完成或修正程式後再試。無須先完成模擬接線。</p></div>:sketch&&<>
    <section><h3>Arduino IDE 設定與燒錄</h3><dl><dt>板型</dt><dd>{sketch.target.label}</dd><dt>編譯目標</dt><dd><code>{sketch.target.fqbn}</code></dd><dt>核心版本</dt><dd><code>{sketch.target.core}</code></dd><dt>需要的函式庫</dt><dd>{sketch.libraries.length?<ul>{sketch.libraries.map(l=><li key={l.name}>{l.name} {l.version}</li>)}</ul>:'僅需 Arduino 核心，無額外函式庫。'}{input.lessonId.includes('oled')||input.lessonId==='environment-lab'?<p>Wire 隨核心提供。</p>:null}</dd></dl>
     <ol><li>下載 .ino，放在與檔名同名的資料夾內（不含副檔名），再用 Arduino IDE 開啟。</li><li>透過開發板管理員安裝以上核心，函式庫管理員安裝以上版本；ESP32 的管理員網址為 <a href="https://espressif.github.io/arduino-esp32/package_esp32_index.json" target="_blank" rel="noreferrer">Espressif 官方索引</a>。</li><li>選擇板型與 USB 連接埠，先「驗證」編譯，再「上傳」燒錄。DHT／OLED 的序列監控視窗設為 115200 baud。</li></ol>
     <p>.json 用於恢復平台練習；.ino 用於 Arduino IDE。接線、電壓、供電與元件規格須依實板核對；本網站不提供韌體檔或直接燒錄。</p>
    </section>
    <section><h3>實板適配說明</h3><ul>{sketch.notes.map(n=><li key={n}>{n}</li>)}</ul></section>
    <section><h3>修改前後差異</h3><p>下列位置對應原程式；標頭與板型註解會另加在檔案開頭。</p><div className="arduino-changes">{sketch.changes.length?sketch.changes.map((c,i)=><details key={i}><summary>第 {c.line} 行／{c.column} 欄 · {c.reason}</summary><p>修改前</p><pre>{c.before||'（新增內容）'}</pre><p>修改後</p><pre>{c.after}</pre></details>):<p>只新增標頭與板型說明，原始程式內容保持原樣。</p>}</div></section>
    <details><summary>查看修改前的原始程式</summary><pre aria-label="修改前原始程式">{input.source}</pre></details>
    <section><h3>完整實板程式</h3><p><code>{sketch.filename}</code></p><pre tabIndex={0} aria-label="完整實板程式">{sketch.code}</pre></section>
   </>}
  </div>
  <footer><button onClick={onClose}>取消</button><button disabled={!sketch} onClick={download}>下載 .ino</button></footer>
 </dialog>;
}
