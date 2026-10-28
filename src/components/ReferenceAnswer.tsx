import {useRef,useState} from 'react';
import {Copy} from 'lucide-react';
import type {LessonId} from '../lessons';
import {solutions} from '../program/solutions';
export default function ReferenceAnswer({lessonId,reference}:{lessonId:LessonId;reference?:{title:string;code:string;notes:string[]}}){
 const solution=reference??solutions[lessonId],code=useRef<HTMLElement>(null);const [message,setMessage]=useState('');
 const copy=async()=>{try{if(!navigator.clipboard)throw new Error('Clipboard unavailable');await navigator.clipboard.writeText(solution.code);setMessage('已複製標準答案。');}catch{const node=code.current;if(node){node.parentElement?.focus();const range=document.createRange();range.selectNodeContents(node);const selection=window.getSelection();selection?.removeAllRanges();selection?.addRange(range);}setMessage('無法自動複製，已選取程式碼；請按 Ctrl＋C，或長按複製。');}};
 return <details className="reference-answer"><summary>查看標準答案</summary><div className="answer-content"><h3>{solution.title}</h3><p>這是符合本課規則的一種完整解法。建議先自行練習，再對照差異；查看或複製都不會修改你的程式。</p><button type="button" onClick={copy}><Copy size={16}/>複製標準答案</button><p className="answer-copy-status" role="status">{message}</p><pre tabIndex={0} aria-label={solution.title}><code ref={code}>{solution.code}</code></pre><h4>重點解說</h4><ul>{solution.notes.map(note=><li key={note}>{note}</li>)}</ul></div></details>;
}
