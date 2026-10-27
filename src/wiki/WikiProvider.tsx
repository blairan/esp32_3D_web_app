import {createContext,useCallback,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {BookOpen,ArrowLeft,X,ArrowUpRight} from 'lucide-react';
import {articles,articleById,type ArticleId} from './articles';
type OpenWiki=(id:ArticleId,origin?:HTMLElement)=>void;
const WikiContext=createContext<OpenWiki>(()=>{});
export function useWiki(){return useContext(WikiContext);}
export default function WikiProvider({children}:{children:ReactNode}){
 const [history,setHistory]=useState<ArticleId[]>([]);const origin=useRef<HTMLElement|null>(null);
 const open=useCallback<OpenWiki>((id,element)=>{origin.current=element??(document.activeElement instanceof HTMLElement?document.activeElement:null);setHistory([id]);},[]);
 const close=useCallback(()=>{setHistory([]);requestAnimationFrame(()=>{if(origin.current?.isConnected)origin.current.focus();});},[]);
 return <WikiContext.Provider value={open}>{children}{history.length?<WikiPanel history={history} onNavigate={id=>setHistory(value=>value.at(-1)===id?value:[...value,id])} onBack={()=>setHistory(value=>value.slice(0,-1))} onClose={close}/>:null}</WikiContext.Provider>;
}
function WikiPanel({history,onNavigate,onBack,onClose}:{history:ArticleId[];onNavigate:(id:ArticleId)=>void;onBack:()=>void;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),body=useRef<HTMLDivElement>(null),heading=useRef<HTMLHeadingElement>(null);const article=articleById.get(history.at(-1)!)!;
 useEffect(()=>{const node=dialog.current!;node.showModal();const overflow=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{node.close();document.body.style.overflow=overflow;};},[]);
 useEffect(()=>{body.current?.scrollTo(0,0);heading.current?.focus();},[article.id]);
 return <dialog className="wiki-dialog" ref={dialog} aria-labelledby="wiki-title" onCancel={event=>{event.preventDefault();onClose();}} onKeyDown={event=>{
   if(event.key==='Escape')event.stopPropagation();
   if(event.key==='Tab'&&!event.ctrlKey&&!event.altKey&&!event.metaKey){
    const items=Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],summary,[tabindex="0"]')).filter(node=>node.getClientRects().length>0);
    const first=items[0],last=items.at(-1),active=document.activeElement;
    if(first&&last&&(!items.includes(active as HTMLElement)||(event.shiftKey&&active===first)||(!event.shiftKey&&active===last))){event.preventDefault();(event.shiftKey?last:first).focus();}
   }
  }}>
  <header className="wiki-header"><span><BookOpen size={19}/>教學 Wiki</span><div><button type="button" aria-label="返回上一篇" disabled={history.length<2} onClick={onBack}><ArrowLeft size={17}/>返回</button><button type="button" aria-label="關閉教學 Wiki" onClick={onClose}><X size={19}/></button></div></header>
  <div className="wiki-body" ref={body}>
   <details className="wiki-directory"><summary>文章目錄 · {articles.length} 個入門主題</summary><nav aria-label="Wiki 文章目錄">{articles.map(item=><button type="button" key={item.id} aria-current={item.id===article.id?'page':undefined} onClick={()=>onNavigate(item.id)}>{item.title}</button>)}</nav></details>
   <article data-wiki-article={article.id}><p className="wiki-kicker">ESP32 入門筆記</p><h2 id="wiki-title" tabIndex={-1} ref={heading}>{article.title}</h2><p className="wiki-summary">{article.summary}</p>
   {article.sections.map(section=><section key={section.title}><h3>{section.title}</h3><p>{section.text}</p></section>)}
   <section><h3>一個小例子</h3><pre><code>{article.example}</code></pre><p>{article.exampleNote}</p></section>
   <section><h3>常見錯誤</h3><ul>{article.mistakes.map(text=><li key={text}>{text}</li>)}</ul></section>
   <section className="wiki-question"><h3>想一想，再動手</h3><p>{article.question}</p></section>
   <section className="wiki-limits"><h3>本模擬器的界線</h3><p>{article.limitation}</p></section>
   <section><h3>官方參考資料</h3><p className="wiki-reference-note">外部文件可能使用英文，並包含本課未支援的功能或完整範例；請以此處標示的模擬範圍為準。</p><ul className="wiki-references">{article.references.map(link=><li key={link.url}><a href={link.url} target="_blank" rel="noopener noreferrer">{link.label}<ArrowUpRight size={14}/><span className="visually-hidden">（另開分頁）</span></a></li>)}</ul></section>
   <section><h3>接著閱讀</h3><div className="wiki-related">{article.related.map(id=><button type="button" key={id} onClick={()=>onNavigate(id)}>{articleById.get(id)!.title}</button>)}</div></section>
   </article>
  </div>
 </dialog>;
}
