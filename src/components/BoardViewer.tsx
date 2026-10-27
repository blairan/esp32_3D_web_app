import { memo, useState } from 'react';
import { RotateCcw, Mouse, Layers3, Plus, Minus } from 'lucide-react';
import { board } from '../board';
import type { CircuitWire } from '../circuit';
import BoardScene from './BoardScene';
interface ViewerProps {
  selectedId:string; onSelect:(id:string)=>void;
  lesson?:{wires:CircuitWire[];lit:boolean;pending:string|null};
}
function BoardViewer({selectedId,onSelect,lesson}:ViewerProps) {
  const [resetKey,setResetKey]=useState(0);
  const [simple,setSimple]=useState(false);
  const [zoomCommand,setZoomCommand]=useState<{direction:1|-1;sequence:number}|null>(null);
  const zoom=(direction:1|-1)=>setZoomCommand(previous=>({direction,sequence:(previous?.sequence??0)+1}));
  return <section className={`viewer${lesson?' lesson-viewer':''}`} aria-label="3D 開發板工作區">
    <BoardScene selectedId={selectedId} onSelect={onSelect} resetKey={resetKey} simple={simple} zoomCommand={zoomCommand} lesson={lesson}/>
    <div className="viewer-toolbar"><div><h2>{board.name}</h2><p>{board.module}<span className="middot">·</span>{lesson?'LED 接線':'38 Pin'}</p></div><button className="reset-button" onClick={()=>setResetKey(k=>k+1)}><RotateCcw size={15}/>重設視角</button></div>
    <div className="zoom-controls" role="group" aria-label="模型縮放"><button aria-label="放大模型" title="放大模型" onClick={()=>zoom(1)}><Plus size={17}/></button><button aria-label="縮小模型" title="縮小模型" onClick={()=>zoom(-1)}><Minus size={17}/></button></div>
    <div className="viewer-bottom"><span className="mouse-help"><Mouse size={21}/><span>拖曳：旋轉<span className="help-separator">　</span>右鍵／Shift＋拖曳：平移<span className="help-separator">　</span>滾輪／雙指捲動：縮放<span className="help-separator">　</span>{lesson?'點兩端：接線':'點擊：選擇接腳'}</span></span><button className={`simple-button${simple?' active':''}`} aria-pressed={simple} onClick={()=>setSimple(v=>!v)} title="隱藏小元件並降低解析度"><Layers3 size={15}/>{simple?'簡化模式開啟':'簡化模式'}</button></div>
  </section>;
}

export default memo(BoardViewer);
