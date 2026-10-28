import ServoStatus from './ServoStatus';
import RgbStatus from './RgbStatus';
import PotControl,{type PotControlProps} from './PotControl';
import LoadStatus from './LoadStatus';
import {loadExercise} from '../loadExercises';
import {buttonExercise} from '../buttonExercises';
import {hasButton,hasADC} from '../lessons';
import DualOutputs from './DualOutputs';
import ReferenceAnswer from './ReferenceAnswer';
import type {LessonId} from '../lessons';
import ButtonControl,{type ButtonControlProps} from './ButtonControl';
import {useWiki} from '../wiki/WikiProvider';
import {topicArticles} from '../wiki/articles';
import { useRef,lazy,Suspense } from 'react';
import { Play, Pause, Square, RotateCcw, FileCode2, CheckCircle2, TriangleAlert, Lightbulb, BookOpen } from 'lucide-react';
import type {ProgramEditorHandle} from './ProgramEditor';
const ProgramEditor=lazy(()=>import('./ProgramEditor'));
import type { ProgramState } from '../program/runtime';
import type { CircuitAnalysis } from '../circuit';
interface Props {
  potControl?:PotControlProps;exampleVisible:boolean;lessonId:LessonId;buttonControl?:ButtonControlProps;source:string;state:ProgramState;analysis:CircuitAnalysis;
  onChange:(source:string)=>void;onStart:()=>void;onPause:()=>void;onResume:()=>void;onStop:()=>void;onReset:()=>void;onScaffold:()=>void;onWiringExample:()=>void;
}
const statusLabels={idle:'尚未執行',starting:'準備中',running:'執行中',paused:'已暫停',stopped:'已停止',error:'需要修正'};
export default function ProgramPanel({potControl,exampleVisible,lessonId,buttonControl,source,state,analysis,onChange,onStart,onPause,onResume,onStop,onReset,onScaffold,onWiringExample}:Props){
  const openWiki=useWiki();const exercise=buttonExercise(lessonId)??loadExercise(lessonId);
  const editor=useRef<ProgramEditorHandle>(null);
  const active=['starting','running','paused'].includes(state.status);
  const jumpToError=()=>{
    if(!state.diagnostic||!editor.current)return;
    editor.current.jump(state.diagnostic.line,state.diagnostic.column);
  };
  return <aside className="inspector program-panel" aria-label="Arduino 程式編輯與執行">
    <div className="program-title"><div><h2><FileCode2 size={20}/>Arduino 程式練習</h2><p>限定語法 · GPIO23 輸出{(lessonId==='traffic-light'||lessonId==='rgb-mixing')?'／GPIO22／GPIO21 輸出':lessonId==='dual-led'?'／GPIO22 輸出':''}{hasButton(lessonId)?'／GPIO18 輸入':hasADC(lessonId)?'／GPIO34 ADC 輸入':''}</p></div><button disabled={active} onClick={()=>{if(window.confirm('要清除目前程式，重新建立 setup / loop 架構嗎？'))onScaffold();}}>重建架構</button></div>
    <Suspense fallback={<p>正在載入程式編輯器…</p>}><ProgramEditor lessonId={lessonId} ref={editor} source={source} readOnly={active} line={state.line} error={state.status==='error'} onChange={onChange}/></Suspense>
    <div className="practice-goal"><div className="practice-heading"><strong>練習目標</strong><button type="button" className="wiki-link" onClick={event=>openWiki(exercise?exercise.topic:lessonId==='traffic-light'?topicArticles.traffic:lessonId==='button-led'?topicArticles.button:lessonId==='dual-led'?topicArticles.dual:topicArticles.structure,event.currentTarget)}><BookOpen size={14}/>查看教學 Wiki</button></div><p>{exercise?exercise.goal:lessonId==='traffic-light'?'將紅 GPIO23、黃 GPIO22、綠 GPIO21 各設為 OUTPUT；紅燈 3 秒 → 綠燈 3 秒 → 黃燈 1 秒，每階段只亮一顆。請自己完成程式。':lessonId==='dual-led'?'將 GPIO23 與 GPIO22 分別設為輸出；先讓 LED 1 亮、LED 2 滅，等待後交換狀態，再等待。請自己完成程式。':lessonId==='button-led'?'設定 GPIO18 內建上拉與 GPIO23 輸出，讀取按鈕電位，用 if／else 讓 LED 按住亮、放開滅，並安排正值等待。請自己完成程式。':'在 setup 設定 GPIO23 輸出，在 loop 讓 LED 亮、等待、熄滅、再等待。請自己完成程式。'}</p><details><summary>需要一點提示？</summary><p>{exercise?exercise.hint:lessonId==='traffic-light'?'三個接腳都要各自設定 OUTPUT。每階段先熄滅前一顆、再點亮下一顆，最後用 delay 維持；完整週期為 7 秒。':lessonId==='dual-led'?'兩個接腳都須先 pinMode。digitalWrite 只改變指定腳位，不會自動熄滅另一顆；請明確寫出兩顆的狀態，再用 delay 維持。':lessonId==='button-led'?'INPUT_PULLUP 下按下是 LOW。先在 loop 宣告讀值變數，或直接在 if 條件呼叫 digitalRead；每一條會執行的路徑都須有正值 delay。':'先宣告接腳變數；設定模式用 pinMode，改變電位用 digitalWrite，等待用 delay。loop 至少要有一次大於 0 的等待。'}</p></details></div>
    <ReferenceAnswer key={lessonId} lessonId={lessonId}/>
    {potControl?<PotControl {...potControl}/>:null}
    {buttonControl?<ButtonControl {...buttonControl}/>:null}
    <div className="program-toolbar"><button className="run-button" onClick={state.status==='paused'?onResume:onStart} disabled={state.status==='running'||state.status==='starting'}><Play size={15}/>{state.status==='paused'?'繼續':'執行'}</button><button onClick={onPause} disabled={state.status!=='running'}><Pause size={15}/>暫停</button><button onClick={onStop} disabled={!active}><Square size={13}/>停止</button><button onClick={onReset}><RotateCcw size={15}/>重設</button></div>
    <p id="program-help" className="program-help">{active?'執行或暫停時鎖定編輯；停止後可修改。':'輸入名稱自動顯示建議；Ctrl＋Space 開啟補全，Enter 接受、Tab 跳參數、Esc 關閉。'}</p>
    <div className="runtime-summary"><span className={`run-status status-${state.status}`} aria-live="polite" data-run-status={state.status}>{statusLabels[state.status]}</span><span>虛擬時間 <strong data-virtual-time={state.timeMs}>{state.timeMs.toLocaleString()} ms</strong></span></div>
    {lessonId==='servo-angle'?<ServoStatus attached={state.servo.attached} angle={state.servo.angle} valid={analysis.valid}/>:lessonId==='rgb-mixing'?<RgbStatus analysis={analysis} values={[23,22,21].map(gpio=>state.outputs[gpio]?.duty??(state.outputs[gpio]?.level==='HIGH'?255:0))}/>: (lessonId==='buzzer-doorbell'||lessonId==='pwm-breathing'||lessonId==='pot-dimming')?<LoadStatus key={`load-${lessonId}`} lessonId={lessonId==='pot-dimming'?'pwm-breathing':lessonId} analysis={analysis} playing={state.status==='running'} duty={state.outputs[23]?.duty??(state.level==='HIGH'?255:0)}/>: (lessonId==='dual-led'||lessonId==='traffic-light')?<DualOutputs analysis={analysis} program={state}/>:<div className="gpio-readout"><span>GPIO23 <strong data-pin-mode={state.outputEnabled?'OUTPUT':'INPUT'}>{state.outputEnabled?'OUTPUT':'INPUT'}</strong> <b data-pin-level={state.level}>{state.level}</b></span><span className={`code-led${analysis.lit?' lit':''}`} data-led-lit={String(analysis.lit)}><Lightbulb size={17}/>{analysis.lit?'LED 亮起':'LED 熄滅'}</span></div>}
    {(lessonId==='button-toggle'||lessonId==='button-counter'||lessonId==='pwm-breathing'||lessonId==='pot-dimming'||lessonId==='rgb-mixing'||lessonId==='ldr-nightlight'||lessonId==='servo-angle')?<section className="variable-monitor" aria-label="全域變數觀察區"><h3>{lessonId==='button-counter'?'按鈕計數器 · 全域變數':'全域變數觀察區'}</h3><p>顯示你程式中的全域整數；變數名稱可自行命名。停止／重設後清除，重新執行從初始值開始。</p>{Object.entries(state.variables).length?<dl>{Object.entries(state.variables).map(([name,value])=><div key={name}><dt>{name}</dt><dd data-variable={name}>{value}</dd></div>)}</dl>:<p>執行並宣告全域變數後，會在這裡顯示數值。</p>}</section>:null}
    {state.diagnostic?<div className="program-error" role="alert"><TriangleAlert size={18}/><div><strong>第 {state.diagnostic.line} 行，第 {state.diagnostic.column} 欄</strong><p>{state.diagnostic.message}</p><button onClick={jumpToError}>跳至錯誤位置</button></div></div>:null}
    <div className={`program-wiring ${analysis.valid?'valid':''}`} data-circuit-code={analysis.code}>{analysis.valid?<CheckCircle2 size={19}/>:<TriangleAlert size={19}/>}<div><strong>{analysis.valid?'接線正確':analysis.title}</strong><p>{analysis.valid?(lessonId==='servo-angle'?'伺服依程式設定角度；暫停保持，停止清除控制。':lessonId==='buzzer-doorbell'?'模組依程式輸出發聲；暫停與停止時示意音安靜。':'LED 跟隨各自程式輸出；暫停保留狀態，停止會熄燈。'):analysis.description}</p></div><button aria-pressed={exampleVisible} onClick={onWiringExample}><BookOpen size={14}/>{exampleVisible?'隱藏接線範例':'顯示接線範例'}</button></div>
    <details className="program-syntax"><summary>支援語法與限制</summary><p>{lessonId==='servo-angle'?<><code>Servo arm;</code>、<code>arm.attach(23);</code>、<code>arm.write(angle);</code>、<code>delay(ms);</code>。物件名稱可自行命名；只接受單一全域 Servo 物件。</>:<><code>int name = 23;</code>、<code>void setup()</code>、<code>void loop()</code>、<code>pinMode(pin, OUTPUT)</code>、<code>digitalWrite(pin, HIGH/LOW)</code>、<code>delay(ms)</code>。參數可使用整數常值或已宣告變數，支援 // 與 /* */ 註解。</>}</p><p>{lessonId==='servo-angle'?'本課僅接受一個全域 Servo 物件、物件.attach(23)、物件.write(0～180)、int、受限加減與 if、delay。模擬器不執行 #include 或載入函式庫；實板必須使用 ESP32Servo 與標頭。未開放微秒寫入、detach、read、任意物件、類別、PWM 或 ADC。':lessonId==='ldr-nightlight'?'本課使用 GPIO34 INPUT、analogRead(34)、GPIO23 OUTPUT 與 digitalWrite；受限整數狀態和 if／else。沒有 ADC 除法、PWM、lux 換算或精確類比求解。':lessonId==='pot-dimming'?'本課另支援 GPIO34 INPUT、analogRead(34)、整數除法 /（先除再加減、向零截斷），以及 GPIO23 analogWrite(0～255) 與受限狀態語法。ADC 接線無效會診斷，不支援 5V、analogReadMilliVolts、map 或浮點數。':lessonId==='rgb-mixing'?'本課只開放 GPIO23／22／21 三色 analogWrite，各 0～255；受限整數變數、賦值、加減與 if。RGB 為共陰極，每色獨立電阻；沒有共陽極、ADC、乘除、ledc API 或使用者迴圈。':lessonId==='pwm-breathing'?'另支援 analogWrite(23, duty)，duty 整數 0～255；受限整數加減、賦值、millis 與最多四層 if。必須先設定 OUTPUT，不支援 analogRead、ledc API、乘除或使用者迴圈。':(lessonId==='button-toggle'||lessonId==='button-counter')?'另支援 GPIO18 INPUT_PULLUP、digitalRead、millis()、已宣告變數賦值、整數 +／-、單一 == != > < >= <= 比較，最多四層 if／else（無 else if）。每個算式最多 32 項，整數超出 32 位元即診斷；不支援乘除、邏輯運算、括號算式、++、for／while、函式庫、Serial、PWM 或網路。':(lessonId==='button-led'||lessonId==='buzzer-doorbell')?'另支援 GPIO18 INPUT_PULLUP、digitalRead、單一 ==／!= 條件與 if／else 大括號區塊。不支援巢狀 if、else if、邏輯運算、算式、重新賦值、迴圈或函式庫。':'不支援算式、變數重新賦值、for/while、自訂函式、函式庫、Serial、PWM 或網路。'}程式上限 12,000 字元、400 行；delay 上限 60,000 ms，loop 需有正值 delay。</p></details>
    <details className="program-trace"><summary>訊號紀錄（最近 {state.trace.length} 筆）</summary>{state.trace.length?<ol>{[...state.trace].reverse().map((entry,index)=><li key={`${entry.timeMs}-${entry.line}-${index}`}><span>{entry.timeMs.toLocaleString()} ms</span><strong>{(lessonId==='dual-led'||lessonId==='traffic-light'||lessonId==='rgb-mixing')?`GPIO${entry.gpio} `:''}{entry.angle!==undefined?`伺服 ${entry.angle}°`:entry.duty!==undefined?`PWM ${entry.duty}/255`:entry.level}</strong><span>第 {entry.line} 行</span></li>)}</ol>:<p>執行後會顯示每次 digitalWrite 的虛擬時間。</p>}</details>
    <p className="program-disclaimer">白名單教學模擬，不編譯任意 C/C++。離開此分頁會停止；重新整理會還原基本架構並清空接線。</p>
  </aside>;
}
