import { categories, pins, titleFor } from '../board';
export default function PinDirectory({ selectedId, onSelect }: { selectedId: string; onSelect: (id: string) => void }) {
  return <section className="directory" aria-labelledby="directory-title">
    <div className="directory-heading"><div><h2 id="directory-title">38 個接腳，一目了然</h2><p>點選下方接腳，與 3D 模型同步探索。也可使用 Tab 與 Enter 操作。</p></div>
      <ul className="legend" aria-label="接腳分類">{Object.entries(categories).map(([key, category]) => <li key={key}><i style={{ background: key==='gpio'?'var(--accent)':category.color }}/>{category.label}</li>)}</ul>
    </div>
    <div className="pin-rows">{['J2', 'J3'].map(header => <div className="pin-row" key={header} role="group" aria-label={`${header} ${header === 'J2' ? '左排' : '右排'} 接腳`}>
      <div className="row-label"><strong>{header}</strong><span>{header === 'J2' ? '左排' : '右排'}</span></div>
      <div className="pin-buttons">{pins.filter(pin => pin.header === header).map(pin => <div className="pin-cell" key={pin.pinId}><span className="pin-number">{String(pin.position).padStart(2, '0')}</span><button
        className={`pin-button category-${pin.category}${selectedId === pin.pinId ? ' selected' : ''}`}
        aria-label={`${pin.pinId} ${titleFor(pin)} ${categories[pin.category].label}`}
        aria-pressed={selectedId === pin.pinId} onClick={() => onSelect(pin.pinId)} title={`${pin.pinId} · ${titleFor(pin)}`}>
        {pin.silkscreen}
      </button></div>)}</div>
    </div>)}</div>
  </section>;
}
