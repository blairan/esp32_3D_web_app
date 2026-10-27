import { Lightbulb, TriangleAlert, ArrowUpRight } from 'lucide-react';
import { board, categories, descriptionFor, functionFor, titleFor } from '../board';
import type { Pin } from '../board';
export default function PinInspector({ pin }: { pin: Pin }) {
  const category = categories[pin.category];
  const role = pin.category === 'gpio' ? '一般輸入 / 輸出' : category.label;
  return <aside className="inspector" aria-label="接腳資訊面板">
    <div className="selection-heading" aria-live="polite" aria-atomic="true">
      <span className="eyebrow">已選擇的接腳</span>
      <h2 style={{ color: category.color }}>{titleFor(pin)}</h2>
      <p><span className="mono">{pin.pinId}</span><span className="middot">·</span>{role}</p>
    </div>
    <h3>接腳資訊</h3>
    <dl className="properties">
      <div><dt>接腳名稱</dt><dd>{titleFor(pin)}<span className="secondary">絲印：{pin.silkscreen}</span></dd></div>
      <div><dt>所在位置</dt><dd><span className="mono">{pin.pinId}</span><span className="secondary">{pin.header === 'J2' ? '左排' : '右排'} · 由天線端往下第 {pin.position} 個</span></dd></div>
      <div><dt>主要角色</dt><dd>{functionFor(pin)}</dd></div>
      <div><dt>邏輯電壓</dt><dd>{pin.gpio !== null ? '3.3 V 邏輯' : pin.role === 'power' ? `${pin.silkscreen === '3V3' ? '3.3' : '5'} V 電源腳` : '非一般 GPIO'}</dd></div>
    </dl>
    <section className="pin-note"><h4>{pin.category === 'reserved' || pin.category === 'input' || pin.category === 'special' ? <TriangleAlert size={16} /> : null}使用提醒</h4><p>{descriptionFor(pin)}</p>{pin.restrictions && <p className="restriction">{pin.restrictions}</p>}</section>
    {pin.gpio === 23 ? <div className="learning-note"><Lightbulb size={23}/><div><h4>從這裡開始</h4><p>GPIO23 是後續外接 LED 課程的接腳。先認識位置，再學習電阻、極性與接線。</p><span>目前為接腳探索，尚未執行電路模擬。</span></div></div> : null}
    <a className="source-link" href={board.source} target="_blank" rel="noreferrer">查閱官方接腳文件 <ArrowUpRight size={14}/></a>
  </aside>;
}
