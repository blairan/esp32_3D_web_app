import {useEffect,useRef,useState} from 'react';
import type {CircuitAnalysis} from '../circuit';
import type {LessonId} from '../lessons';
export default function LoadStatus({lessonId,analysis,duty=0,playing=true}:{lessonId:LessonId;analysis:CircuitAnalysis;duty?:number;playing?:boolean}){
 const audio=useRef<AudioContext|null>(null);const [enabled,setEnabled]=useState(false),[visible,setVisible]=useState(!document.hidden),[message,setMessage]=useState('聲音預設關閉；可自行開啟示意音。');
 useEffect(()=>{const change=()=>setVisible(!document.hidden);const blur=()=>setVisible(false);const focus=()=>setVisible(!document.hidden);document.addEventListener('visibilitychange',change);window.addEventListener('blur',blur);window.addEventListener('focus',focus);return()=>{document.removeEventListener('visibilitychange',change);window.removeEventListener('blur',blur);window.removeEventListener('focus',focus);};},[]);
 useEffect(()=>{if(enabled&&visible&&playing&&analysis.lit&&audio.current?.state==='running'){
  const oscillator=audio.current.createOscillator(),gain=audio.current.createGain();oscillator.frequency.value=2000;gain.gain.value=.025;oscillator.connect(gain);gain.connect(audio.current.destination);oscillator.start();
  return()=>{oscillator.stop();oscillator.disconnect();gain.disconnect();};
 }},[enabled,visible,playing,analysis.lit]);
 useEffect(()=>()=>{const context=audio.current;if(context&&context.state!=='closed')void context.close().catch(()=>{});},[]);
 const toggle=async()=>{if(enabled){setEnabled(false);return;}try{audio.current??=new AudioContext();await audio.current.resume();setEnabled(true);setMessage('已開啟低音量示意音；暫停、停止、離開視窗或切換專題會安靜。');}catch{setEnabled(false);setMessage('此瀏覽器無法啟動聲音，仍可觀察發聲狀態。');}};
 if(lessonId==='pwm-breathing')return <section className="load-status" aria-label="PWM 亮度觀察"><h3>PWM · GPIO23</h3><p data-duty={duty}>佔空比 {duty} / 255 · 約 {Math.round(duty/255*100)}%</p><div className="brightness-meter" role="meter" aria-label="亮度示意" aria-valuemin={0} aria-valuemax={255} aria-valuenow={analysis.valid?duty:0}><i style={{width:`${analysis.valid?duty/255*100:0}%`}}/></div><p data-pwm-lit={String(analysis.lit)}>{analysis.valid?'接線有效，亮度隨佔空比變化。':'請先完成有效接線；目前無亮度示意。'}這是 PWM 平均亮度示意，不代表類比電壓、實測電流或人眼線性亮度。</p></section>;
 return <section className="load-status" aria-label="蜂鳴器狀態"><h3>主動式蜂鳴器 · GPIO23 訊號</h3><p data-buzzer-active={String(analysis.lit)}>{analysis.lit?'模組發聲中':'模組安靜'}{!playing&&analysis.lit?'（已暫停，示意音停止）':''}</p><button type="button" aria-pressed={enabled} onClick={toggle}>{enabled?'關閉示意音':'開啟示意音'}</button><p role="status">{message}</p><p>3.3V 相容、內建驅動的三腳教學模組；GPIO 僅接 S 訊號。示意音固定頻率，不模擬真實音色與音量。</p></section>;
}
