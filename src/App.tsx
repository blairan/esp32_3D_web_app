import { useCallback, useState } from 'react';
import { Box, RotateCcw, Mouse, Info, Layers3, Plus, Minus } from 'lucide-react';
import { board, pinById } from './board';
import BoardScene from './components/BoardScene';
import PinInspector from './components/PinInspector';
import PinDirectory from './components/PinDirectory';
export default function App() {
  const [selectedId, setSelectedId] = useState('J3-02');
  const [resetKey, setResetKey] = useState(0);
  const [simple, setSimple] = useState(false);
  const [zoomCommand, setZoomCommand] = useState<{ direction: 1 | -1; sequence: number } | null>(null);
  const zoom = (direction: 1 | -1) => setZoomCommand(previous => ({ direction, sequence: (previous?.sequence ?? 0) + 1 }));
  const selectPin = useCallback((id: string) => { if (pinById.has(id)) setSelectedId(id); }, []);
  return <>
    <a className="skip-link" href="#pin-directory">跳至接腳清單</a>
    <header className="app-header"><div className="brand"><Box size={31} strokeWidth={1.6}/><span>ESP32 <span className="brand-rest">Interactive Lab</span></span></div><span className="header-section">硬體探索</span></header>
    <main>
      <section className="intro"><h1>從一個接腳，認識 ESP32。</h1><p>旋轉開發板，點選接腳，探索每個 GPIO 的用途。</p></section>
      <div className="workbench">
        <section className="viewer" aria-label="3D 開發板工作區">
          <BoardScene selectedId={selectedId} onSelect={selectPin} resetKey={resetKey} simple={simple} zoomCommand={zoomCommand}/>
          <div className="viewer-toolbar"><div><h2>{board.name}</h2><p>{board.module}<span className="middot">·</span>38 Pin</p></div><button className="reset-button" onClick={() => setResetKey(k => k + 1)}><RotateCcw size={15}/>重設視角</button></div>
          <div className="zoom-controls" role="group" aria-label="模型縮放"><button aria-label="放大模型" title="放大模型" onClick={() => zoom(1)}><Plus size={17}/></button><button aria-label="縮小模型" title="縮小模型" onClick={() => zoom(-1)}><Minus size={17}/></button></div>
          <div className="viewer-bottom"><span className="mouse-help"><Mouse size={21}/><span>拖曳：旋轉<span className="help-separator">　</span>右鍵／Shift＋拖曳：平移<span className="help-separator">　</span>滾輪／雙指捲動：縮放<span className="help-separator">　</span>點擊：選擇接腳</span></span><button className={`simple-button${simple ? ' active' : ''}`} aria-pressed={simple} onClick={() => setSimple(v => !v)} title="隱藏小元件並降低解析度"><Layers3 size={15}/>{simple ? '簡化模式開啟' : '簡化模式'}</button></div>
        </section>
        <PinInspector pin={pinById.get(selectedId)!}/>
      </div>
      <div id="pin-directory"><PinDirectory selectedId={selectedId} onSelect={selectPin}/></div>
      <footer className="app-footer"><Info size={15}/><p>這是教學用的簡化 3D 模型，接腳映射依官方文件整理；元件外觀與尺寸為示意，不作為實際接線或機械設計依據。</p></footer>
    </main>
  </>;
}
