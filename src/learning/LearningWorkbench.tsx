import {createContext,useContext,useRef,type ReactNode} from 'react';
import {learningSteps,type LearningStep} from './navigation';
const StepContext=createContext<LearningStep>('intro');
export function StepSection({when,children,className=''}:{when:LearningStep|LearningStep[];children:ReactNode;className?:string}){
  const step=useContext(StepContext),visible=Array.isArray(when)?when.includes(step):when===step;
  return <div className={'learning-section '+className} data-step-section={Array.isArray(when)?when.join(' '):when} hidden={!visible}>{children}</div>;
}
export default function LearningWorkbench({exploring,step,onStep,viewer,explorer,controls,files,children}:{exploring:boolean;step:LearningStep;onStep:(step:LearningStep)=>void;viewer:ReactNode;explorer:ReactNode;controls:ReactNode;files:ReactNode;children:ReactNode}){
  const tabs=useRef<HTMLDivElement>(null);
  return <div className="workbench learning-workbench" data-learning-step={step} data-exploring={String(exploring)}>
    <div className="bench-side">{viewer}</div>
    <div className="learning-side"><div hidden={!exploring}>{explorer}</div>
      <section className="learning-panel" aria-label="專題學習工作區" hidden={exploring}>
        <div ref={tabs} className="learning-tabs" role="tablist" aria-label="教學步驟" onKeyDown={e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const current=learningSteps.findIndex(s=>s.id===step),index=e.key==='Home'?0:e.key==='End'?3:(current+(e.key==='ArrowRight'?1:3))%4;onStep(learningSteps[index].id);tabs.current?.querySelectorAll<HTMLButtonElement>('[role=tab]')[index]?.focus();}}>
          {learningSteps.map((s,i)=><button type="button" key={s.id} role="tab" id={'step-tab-'+s.id} aria-selected={step===s.id} aria-controls="learning-step-content" tabIndex={step===s.id?0:-1} onClick={()=>onStep(s.id)}><span>0{i+1}</span>{s.title}</button>)}
        </div>
        <StepContext.Provider value={step}><div className="learning-body" id="learning-step-content" role="tabpanel" tabIndex={-1} aria-labelledby={'step-tab-'+step}>{children}</div></StepContext.Provider>
        <div className="learning-controls">{controls}</div><div className="learning-files">{files}</div>
      </section>
    </div>
  </div>;
}
