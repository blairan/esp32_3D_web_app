import {useEffect,useRef} from 'react';
import {Palette,Check} from 'lucide-react';
import {themePresets} from '../appearance';
export default function AppearanceControl({accent,onChange}:{accent:string;onChange:(value:string)=>void}){
 const root=useRef<HTMLDetailsElement>(null);
 useEffect(()=>{const outside=(event:PointerEvent)=>{if(root.current&&!root.current.contains(event.target as Node))root.current.open=false;};const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'&&root.current?.open){root.current.open=false;root.current.querySelector('summary')?.focus();}};document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};},[]);
 return <details ref={root} className="appearance-control"><summary><Palette size={17}/><span>外觀</span></summary><div className="appearance-menu"><h2>主題色</h2><div className="theme-presets">{themePresets.map(preset=><button key={preset.color} aria-label={`主題色 ${preset.name}`} aria-pressed={accent===preset.color} onClick={()=>onChange(preset.color)}><i style={{background:preset.color}}>{accent===preset.color?<Check size={13}/>:null}</i>{preset.name}</button>)}</div><label className="custom-color">自訂主色<input type="color" aria-label="自訂主色" value={accent} onChange={event=>onChange(event.target.value)}/><code>{accent.toUpperCase()}</code></label><p>只記住此瀏覽器的外觀偏好，不會同步程式或接線。</p></div></details>;
}
