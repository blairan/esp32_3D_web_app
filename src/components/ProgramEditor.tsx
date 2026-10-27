import {forwardRef,useEffect,useImperativeHandle,useRef} from 'react';
import {EditorState,Compartment,StateEffect,StateField} from '@codemirror/state';
import {EditorView,Decoration,keymap,showTooltip} from '@codemirror/view';
import {basicSetup} from 'codemirror';
import {cpp} from '@codemirror/lang-cpp';
import {autocompletion,snippetCompletion,startCompletion,type CompletionContext} from '@codemirror/autocomplete';
import {indentWithTab} from '@codemirror/commands';
import {syntaxTree} from '@codemirror/language';
import {lessonSuggestions,declaredVariables} from '../program/completion';
import {limits} from '../program/language';
export interface ProgramEditorHandle {jump:(line:number,column:number)=>void}
const markLine=StateEffect.define<{line:number;error:boolean}>();
const executionLine=StateField.define({
 create:()=>Decoration.none,
 update(value,tr){value=value.map(tr.changes);for(const effect of tr.effects)if(effect.is(markLine)){const {line,error}=effect.value;value=line>0&&line<=tr.state.doc.lines?Decoration.set([Decoration.line({class:error?'cm-diagnostic-line':'cm-execution-line'}).range(tr.state.doc.line(line).from)]):Decoration.none;}return value;},
 provide:field=>EditorView.decorations.from(field),
});
function complete(context:CompletionContext){
 const node=syntaxTree(context.state).resolveInner(context.pos,-1);if(/Comment|String/.test(node.name))return null;
 const word=context.matchBefore(/[A-Za-z_]\w*/);if(!word&&!context.explicit)return null;
 const before=context.state.doc.sliceString(0,context.pos);
 return {from:word?.from??context.pos,options:[...lessonSuggestions.map(item=>snippetCompletion(item.template,{label:item.label,detail:item.detail,type:item.type})),...declaredVariables(before).map(label=>({label,type:'variable',detail:'已宣告整數變數'}))],validFor:/^[A-Za-z_]\w*$/};
}
export default forwardRef<ProgramEditorHandle,{source:string;readOnly:boolean;line:number;error:boolean;onChange:(value:string)=>void}>(function ProgramEditor({source,readOnly,line,error,onChange},ref){
 const host=useRef<HTMLDivElement>(null),view=useRef<EditorView|null>(null),change=useRef(onChange),locked=useRef(new Compartment());change.current=onChange;
 useImperativeHandle(ref,()=>({jump(line,column){const editor=view.current;if(!editor)return;const row=editor.state.doc.line(Math.min(Math.max(1,line),editor.state.doc.lines));const pos=Math.min(row.to,row.from+Math.max(0,column-1));editor.dispatch({selection:{anchor:pos,head:Math.min(row.to,pos+1)},effects:EditorView.scrollIntoView(pos,{y:'center'})});editor.focus();}}),[]);
 useEffect(()=>{
  const editor=new EditorView({parent:host.current!,state:EditorState.create({doc:source,extensions:[basicSetup,cpp(),executionLine,showTooltip.compute(['doc','selection'],state=>{
   if(state.readOnly)return null;const pos=state.selection.main.head;const row=state.doc.lineAt(pos);const text=state.doc.sliceString(row.from,pos);const match=text.match(/\b(pinMode|digitalWrite|delay)\([^)]*$/);
   if(!match||/Comment|String/.test(syntaxTree(state).resolveInner(pos,-1).name))return null;
   const item=lessonSuggestions.find(item=>item.label===match[1])!;
   return {pos,above:true,create:()=>{const dom=document.createElement('div');dom.className='parameter-hint';dom.textContent=item.detail;return {dom};}};
  }),locked.current.of(EditorState.readOnly.of(readOnly)),EditorView.contentAttributes.of({'aria-label':'Arduino 程式碼','aria-describedby':'program-help',spellcheck:'false',autocapitalize:'off',autocorrect:'off'}),autocompletion({override:[complete],activateOnTyping:true}),keymap.of([{key:'Ctrl-Space',run:startCompletion},indentWithTab]),EditorState.transactionFilter.of(tr=>tr.newDoc.length>limits.source?[]:tr),EditorView.updateListener.of(update=>{if(update.docChanged)change.current(update.state.doc.toString());}),EditorView.theme({'&':{height:'330px',fontSize:'13px',backgroundColor:'#f8fafc',color:'#244868'},'.cm-scroller':{overflow:'auto',fontFamily:'ui-monospace, Consolas, monospace'},'.cm-content':{padding:'12px 0'},'.cm-gutters':{backgroundColor:'#f3f6f9',color:'#8393a7',borderRight:'1px solid #e3e9f0'},'.cm-tooltip':{fontSize:'12px',color:'#243850',backgroundColor:'#fff'},'.cm-execution-line':{backgroundColor:'#e9efff'},'.cm-diagnostic-line':{backgroundColor:'#fce5dc'}})]})});view.current=editor;
  return()=>{editor.destroy();view.current=null;};
 // The editor owns its lifecycle; source and lock changes are synchronized below.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 useEffect(()=>{const editor=view.current;if(editor&&editor.state.doc.toString()!==source)editor.dispatch({changes:{from:0,to:editor.state.doc.length,insert:source}});},[source]);
 useEffect(()=>{view.current?.dispatch({effects:locked.current.reconfigure(EditorState.readOnly.of(readOnly))});},[readOnly]);
 useEffect(()=>{view.current?.dispatch({effects:markLine.of({line,error})});},[line,error]);
 return <div className="program-editor" ref={host}/>;
});
