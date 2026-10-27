import type {LessonId} from '../lessons';
import {useWiki} from '../wiki/WikiProvider';
import {topicArticles,type ArticleId} from '../wiki/articles';
import {forwardRef,useEffect,useImperativeHandle,useRef} from 'react';
import {EditorState,Compartment,StateEffect,StateField} from '@codemirror/state';
import {EditorView,Decoration,keymap,showTooltip} from '@codemirror/view';
import {basicSetup} from 'codemirror';
import {cpp} from '@codemirror/lang-cpp';
import {autocompletion,snippetCompletion,startCompletion,type CompletionContext} from '@codemirror/autocomplete';
import {indentWithTab} from '@codemirror/commands';
import {syntaxTree} from '@codemirror/language';
import {suggestionsFor,declaredVariables} from '../program/completion';
import {limits} from '../program/language';
export interface ProgramEditorHandle {jump:(line:number,column:number)=>void}
const markLine=StateEffect.define<{line:number;error:boolean}>();
const executionLine=StateField.define({
 create:()=>Decoration.none,
 update(value,tr){value=value.map(tr.changes);for(const effect of tr.effects)if(effect.is(markLine)){const {line,error}=effect.value;value=line>0&&line<=tr.state.doc.lines?Decoration.set([Decoration.line({class:error?'cm-diagnostic-line':'cm-execution-line'}).range(tr.state.doc.line(line).from)]):Decoration.none;}return value;},
 provide:field=>EditorView.decorations.from(field),
});
function complete(context:CompletionContext,onRead:(id:ArticleId)=>void,lessonId:LessonId){
 const node=syntaxTree(context.state).resolveInner(context.pos,-1);if(/Comment|String/.test(node.name))return null;
 const word=context.matchBefore(/[A-Za-z_]\w*/);if(!word&&!context.explicit)return null;
 const before=context.state.doc.sliceString(0,context.pos);
 return {from:word?.from??context.pos,options:[...suggestionsFor(lessonId).map(item=>snippetCompletion(item.template,{label:item.label,detail:item.detail,type:item.type,info:()=>{const dom=document.createElement('div');dom.className='completion-wiki-info';const text=document.createElement('p');text.textContent=item.detail;dom.append(text);const topic=topicArticles[item.label as keyof typeof topicArticles]??(item.label==='INPUT_PULLUP'?topicArticles.button:item.label==='int'?topicArticles.structure:topicArticles.gpio);dom.append(wikiButton(()=>onRead(topic)));return {dom};}})),...declaredVariables(before).map(label=>({label,type:'variable',detail:'已宣告整數變數'}))],validFor:/^[A-Za-z_]\w*$/};
}
function wikiButton(open:()=>void){const button=document.createElement('button');button.type='button';button.className='wiki-link';button.textContent='查閱解說';button.addEventListener('mousedown',event=>event.preventDefault());button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();open();});return button;}
export default forwardRef<ProgramEditorHandle,{lessonId:LessonId;source:string;readOnly:boolean;line:number;error:boolean;onChange:(value:string)=>void}>(function ProgramEditor({lessonId,source,readOnly,line,error,onChange},ref){
 const currentLesson=useRef(lessonId);currentLesson.current=lessonId;
 const openWiki=useWiki();const readWiki=useRef<(id:ArticleId)=>void>(()=>{});readWiki.current=id=>{const editor=view.current;if(editor)openWiki(id,editor.contentDOM);};
 const host=useRef<HTMLDivElement>(null),view=useRef<EditorView|null>(null),change=useRef(onChange),locked=useRef(new Compartment());change.current=onChange;
 useImperativeHandle(ref,()=>({jump(line,column){const editor=view.current;if(!editor)return;const row=editor.state.doc.line(Math.min(Math.max(1,line),editor.state.doc.lines));const pos=Math.min(row.to,row.from+Math.max(0,column-1));editor.dispatch({selection:{anchor:pos,head:Math.min(row.to,pos+1)},effects:EditorView.scrollIntoView(pos,{y:'center'})});editor.focus();}}),[]);
 useEffect(()=>{
  const editor=new EditorView({parent:host.current!,state:EditorState.create({doc:source,extensions:[basicSetup,cpp(),executionLine,showTooltip.compute(['doc','selection'],state=>{
   if(state.readOnly)return null;const pos=state.selection.main.head;const row=state.doc.lineAt(pos);const text=state.doc.sliceString(row.from,pos);const match=text.match(/\b(pinMode|digitalWrite|digitalRead|delay)\([^)]*$/);
   if(!match||(match[1]==='digitalRead'&&currentLesson.current==='blink')||/Comment|String/.test(syntaxTree(state).resolveInner(pos,-1).name))return null;
   const item=suggestionsFor(currentLesson.current).find(item=>item.label===match[1])!;
   return {pos,above:true,create:()=>{const dom=document.createElement('div');dom.className='parameter-hint';const text=document.createElement('span');text.textContent=item.detail;dom.append(text,wikiButton(()=>readWiki.current(topicArticles[match[1] as 'pinMode'|'digitalWrite'|'digitalRead'|'delay'])));return {dom};}};
  }),locked.current.of(EditorState.readOnly.of(readOnly)),EditorView.contentAttributes.of({'aria-label':'Arduino 程式碼','aria-describedby':'program-help',spellcheck:'false',autocapitalize:'off',autocorrect:'off'}),autocompletion({override:[context=>complete(context,id=>readWiki.current(id),currentLesson.current)],activateOnTyping:true}),keymap.of([{key:'Ctrl-Space',run:startCompletion},indentWithTab]),EditorState.transactionFilter.of(tr=>tr.newDoc.length>limits.source?[]:tr),EditorView.updateListener.of(update=>{if(update.docChanged)change.current(update.state.doc.toString());}),EditorView.theme({'&':{height:'330px',fontSize:'13px',backgroundColor:'#f8fafc',color:'#244868'},'.cm-scroller':{overflow:'auto',fontFamily:'ui-monospace, Consolas, monospace'},'.cm-content':{padding:'12px 0'},'.cm-gutters':{backgroundColor:'#f3f6f9',color:'#8393a7',borderRight:'1px solid #e3e9f0'},'.cm-tooltip':{fontSize:'12px',color:'#243850',backgroundColor:'#fff'},'.cm-execution-line':{backgroundColor:'#e9efff'},'.cm-diagnostic-line':{backgroundColor:'#fce5dc'}})]})});view.current=editor;
  return()=>{editor.destroy();view.current=null;};
 // The editor owns its lifecycle; source and lock changes are synchronized below.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 useEffect(()=>{const editor=view.current;if(editor&&editor.state.doc.toString()!==source)editor.dispatch({changes:{from:0,to:editor.state.doc.length,insert:source}});},[source]);
 useEffect(()=>{view.current?.dispatch({effects:locked.current.reconfigure(EditorState.readOnly.of(readOnly))});},[readOnly]);
 useEffect(()=>{view.current?.dispatch({effects:markLine.of({line,error})});},[line,error]);
 return <div className="program-editor" ref={host}/>;
});
