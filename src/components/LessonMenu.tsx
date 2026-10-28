import {useEffect,useRef} from 'react';
import {BookOpen,ChevronDown,Lightbulb,Check} from 'lucide-react';
import {lessons,type LessonId} from '../lessons';
interface Props {lessonId:LessonId;mode:'explore'|'led'|'code';onWiring:()=>void;onLesson:(id:LessonId)=>boolean}
export default function LessonMenu({lessonId,mode,onWiring,onLesson}:Props){
 const root=useRef<HTMLDetailsElement>(null);
 useEffect(()=>{const outside=(event:PointerEvent)=>{if(root.current&&!root.current.contains(event.target as Node))root.current.open=false;};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);},[]);
 const close=()=>{if(root.current){root.current.open=false;root.current.querySelector('summary')?.focus();}};
 return <details ref={root} className={`lesson-menu${mode!=='explore'?' active':''}`} onKeyDown={event=>{if(event.key==='Escape'&&root.current?.open){event.preventDefault();event.stopPropagation();close();}}}>
  <summary><BookOpen size={17}/><span>學習專題</span><ChevronDown size={13}/></summary>
  <div className="lesson-menu-items"><p>目前專題 · {lessons[lessonId].title}</p>
   <button type="button" aria-current={mode==='led'?'page':undefined} onClick={()=>{onWiring();close();}}><Lightbulb size={16}/><span>{lessonId==='buzzer-doorbell'?'蜂鳴器接線':'LED 接線'}<small>檢查目前專題的接線與手動輸出</small></span>{mode==='led'?<Check size={15}/>:null}</button>
   <h2>選擇專題 · 程式練習</h2>
   {Object.values(lessons).map(item=><button type="button" key={item.id} aria-current={mode==='code'&&lessonId===item.id?'page':undefined} onClick={()=>{if(onLesson(item.id))close();}}><BookOpen size={16}/><span>{item.title}</span>{mode==='code'&&lessonId===item.id?<Check size={15}/>:null}</button>)}
  </div>
 </details>;
}
