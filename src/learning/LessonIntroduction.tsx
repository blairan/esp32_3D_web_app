import type {ReactNode} from 'react';
export default function LessonIntroduction({goal,parts,expected,children}:{goal:string;parts:string[];expected:string;children:ReactNode}){
  return <section className="lesson-introduction"><h2>認識這個專題</h2><p className="guide-goal">{goal}</p><h3>準備元件</h3><ul className="parts-list">{parts.map(p=><li key={p}>{p}</li>)}</ul><h3>預期現象</h3><p>{expected}</p><p className="guide-note">這是練習目標；即時結果請執行自己的程式後，在「觀察結果」查看。</p>{children}</section>;
}
