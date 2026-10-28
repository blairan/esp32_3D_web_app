import type {OledState} from '../program/peripheralTypes';
import {hasButton} from '../lessons';
import type {LessonId} from '../lessons';
import { memo, useState } from 'react';
import { RotateCcw, Mouse, Layers3, Plus, Minus, Zap } from 'lucide-react';
import { board } from '../board';
import type { CircuitWire } from '../circuit';
import BoardScene from './BoardScene';
interface ViewerProps {
  selectedId:string; onSelect:(id:string)=>void;
  lesson?:{id:LessonId;pressed:boolean;lit2:boolean;lit3:boolean;brightness:number;rgb:number[];potPosition:number;lightPosition:number;servoAngle:number;motion:boolean;oled:OledState;wires:CircuitWire[];lit:boolean;pending:string|null;playing:boolean};
  onButtonPress?:(down:boolean)=>void;accent:string;flow:boolean;reducedMotion:boolean;onToggleFlow:()=>void;
}
function BoardViewer({selectedId,onSelect,lesson,accent,flow,reducedMotion,onToggleFlow,onButtonPress}:ViewerProps) {
  const [resetKey,setResetKey]=useState(0);
  const [simple,setSimple]=useState(false);
  const [zoomCommand,setZoomCommand]=useState<{direction:1|-1;sequence:number}|null>(null);
  const zoom=(direction:1|-1)=>setZoomCommand(previous=>({direction,sequence:(previous?.sequence??0)+1}));
  return <section className={`viewer${lesson?' lesson-viewer':''}`} aria-label="3D 開發板工作區">
    <BoardScene onButtonPress={onButtonPress} selectedId={selectedId} onSelect={onSelect} resetKey={resetKey} simple={simple} zoomCommand={zoomCommand} lesson={lesson} accent={accent} flow={flow} reducedMotion={reducedMotion}/>
    <div className="viewer-toolbar"><div><h2>{board.name}</h2><p>{board.module}<span className="middot">·</span>{lesson?(String(lesson.id)==='seven-counter'?'四位七段顯示器':String(lesson.id)==='environment-lab'?'DHT22＋OLED＋LED':(lesson.id==='climate-dht'||String(lesson.id)==='environment-lab')?'DHT22 溫溼度警示':(lesson.id==='oled-i2c'||String(lesson.id)==='seven-counter'||String(lesson.id)==='environment-lab')?'SSD1306 文字顯示':lesson.id==='buzzer-doorbell'?'按鈕與主動式蜂鳴器':lesson.id==='ultrasonic-alert'?'Echo 分壓測距':lesson.id==='pir-delay'?'PIR 延遲燈':lesson.id==='servo-angle'?'外部供電伺服':lesson.id==='ldr-nightlight'?'光敏分壓夜燈':lesson.id==='rgb-mixing'?'共陰極 RGB 混色':lesson.id==='pot-dimming'?'ADC 電位器調光':lesson.id==='pwm-breathing'?'PWM 亮度示意':hasButton(lesson.id)?'按鈕與 LED':lesson.id==='traffic-light'?'紅黃綠號誌':lesson.id==='dual-led'?'雙 LED 接線':'LED 接線'):`${board.pins.length} 個排針端點`}</p></div><button className="reset-button" onClick={()=>setResetKey(k=>k+1)}><RotateCcw size={15}/>重設視角</button></div>
    <div className="zoom-controls" role="group" aria-label="模型縮放"><button aria-label="放大模型" title="放大模型" onClick={()=>zoom(1)}><Plus size={17}/></button><button aria-label="縮小模型" title="縮小模型" onClick={()=>zoom(-1)}><Minus size={17}/></button></div>

    <div className="viewer-bottom">{lesson&&lesson.id!=='oled-i2c'&&lesson.id!=='seven-counter'&&<div className={`current-indicator${(lesson.lit||lesson.lit2||lesson.lit3)?' conducting':''}`} title="亮點與箭頭表示依課程供電路徑朝 GND 的慣用電流方向，不代表電子速度或精確電流大小。" data-current-active={String(lesson.lit||lesson.lit2||lesson.lit3)} data-current-motion={(lesson.lit||lesson.lit2||lesson.lit3)&&flow&&lesson.playing&&!simple&&!reducedMotion?'moving':(lesson.lit||lesson.lit2||lesson.lit3)&&flow?'static':'off'}><Zap size={14}/><span>{!flow?'電流示意已關閉':!(lesson.lit||lesson.lit2||lesson.lit3)?'未導通：無電流示意':!lesson.playing?'電流示意：已暫停':simple||reducedMotion?'靜態電流方向指示':lesson?.id==='pwm-breathing'?'PWM 平均亮度與電流方向':'電流方向示意'}</span><small>非精確電流量測</small></div>}<span className="mouse-help"><Mouse size={21}/><span>拖曳：旋轉<span className="help-separator">　</span>右鍵／Shift＋拖曳：平移<span className="help-separator">　</span>滾輪／雙指捲動：縮放<span className="help-separator">　</span>{lesson?'點兩端：接線':'點擊：選擇接腳'}</span></span><div className="viewer-toggles">{lesson&&lesson.id!=='oled-i2c'&&lesson.id!=='seven-counter'&&<button className={`simple-button${flow?' active':''}`} aria-pressed={flow} onClick={onToggleFlow}><Zap size={14}/>電流效果</button>}<button className={`simple-button${simple?' active':''}`} aria-pressed={simple} onClick={()=>setSimple(v=>!v)} title="隱藏小元件並降低解析度"><Layers3 size={15}/>{simple?'簡化模式開啟':'簡化模式'}</button></div></div>
  </section>;
}

export default memo(BoardViewer);
