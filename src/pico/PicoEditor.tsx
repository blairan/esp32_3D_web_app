import {useEffect,useRef} from 'react';
import {EditorState,Compartment,StateEffect,StateField} from '@codemirror/state';
import {EditorView,Decoration,keymap} from '@codemirror/view';
import {basicSetup} from 'codemirror';
import {python} from '@codemirror/lang-python';
import {syntaxTree,indentUnit} from '@codemirror/language';
import {autocompletion,snippetCompletion,startCompletion} from '@codemirror/autocomplete';
import {indentWithTab} from '@codemirror/commands';
import type {PicoArticleId} from './content';
const mark=StateEffect.define<{line:number;error:boolean}>();
const highlight=StateField.define({create:()=>Decoration.none,update(value,tr){value=value.map(tr.changes);for(const effect of tr.effects)if(effect.is(mark)){const {line,error}=effect.value;value=line>0&&line<=tr.state.doc.lines?Decoration.set([Decoration.line({class:error?'cm-diagnostic-line':'cm-execution-line'}).range(tr.state.doc.line(line).from)]):Decoration.none;}return value;},provide:f=>EditorView.decorations.from(f)});
export default function PicoEditor({source,readOnly,line,error,onChange,onRead}:{source:string;readOnly:boolean;line:number;error:boolean;onChange:(s:string)=>void;onRead:(id:PicoArticleId,origin?:HTMLElement)=>void}){
 const host=useRef<HTMLDivElement>(null),view=useRef<EditorView|null>(null),current=useRef({onChange,onRead});current.current={onChange,onRead};const locked=useRef(new Compartment());
 useEffect(()=>{
  const editor=new EditorView({parent:host.current!,state:EditorState.create({doc:source,extensions:[basicSetup,python(),indentUnit.of('    '),EditorView.lineWrapping,highlight,locked.current.of(EditorState.readOnly.of(readOnly)),EditorView.contentAttributes.of({'aria-label':'MicroPython 程式碼','aria-describedby':'python-help',spellcheck:'false',autocapitalize:'off',autocorrect:'off'}),autocompletion({override:[context=>{
   if(context.state.readOnly||/Comment|String/.test(syntaxTree(context.state).resolveInner(context.pos,-1).name))return null;
   const word=context.matchBefore(/[A-Za-z_]\w*(?:\.\w*)?/);if(!word&&!context.explicit)return null;
   const doc=context.state.doc.toString(),name=doc.match(/^([A-Za-z_]\w*)\s*=\s*Pin\(/m)?.[1]??'led';
   const options=[['Pin','Pin("LED", Pin.OUT)','建立板載 LED 輸出','pin'],['while','while True:\n    ${指令}','4個空白縮排的重複區塊','intro'],[name+'.on',name+'.on()','開啟板載 LED','pin'],[name+'.off',name+'.off()','關閉板載 LED','pin'],[name+'.toggle',name+'.toggle()','反轉板載 LED 狀態','pin'],[name+'.value',name+'.value(${0})','設定 LED：0 關、1 開','pin'],['time.sleep','time.sleep(${1})','等待秒數，可用小數秒','timing'],['time.sleep_ms','time.sleep_ms(${1000})','等待整數毫秒','timing']];
   return {from:word?.from??context.pos,options:options.map(([label,template,detail,topic])=>snippetCompletion(template,{label,detail,type:'function',info:()=>{const dom=document.createElement('div');dom.className='completion-wiki-info';const p=document.createElement('p');p.textContent=detail;const button=document.createElement('button');button.className='wiki-link';button.textContent='查閱解說';button.onmousedown=e=>e.preventDefault();button.onclick=()=>current.current.onRead(topic as PicoArticleId,editor.contentDOM);dom.append(p,button);return {dom};}})),validFor:/^[A-Za-z_][\w.]*$/};
  }]}),keymap.of([{key:'Ctrl-Space',run:startCompletion},indentWithTab]),EditorState.tabSize.of(4),EditorState.transactionFilter.of(tr=>tr.newDoc.length>12000||tr.newDoc.lines>400?[]:tr),EditorView.updateListener.of(u=>{if(u.docChanged)current.current.onChange(u.state.doc.toString());}),EditorView.theme({'&':{height:'380px',fontSize:'16px',backgroundColor:'#f8fafc',color:'#244868'},'.cm-scroller':{overflow:'auto',fontFamily:'ui-monospace,Consolas,monospace'},'.cm-content':{lineHeight:'1.7',padding:'12px 0'},'.cm-tooltip':{background:'#fff',color:'#243850',fontSize:'15px'},'.cm-execution-line':{background:'#e9efff'},'.cm-diagnostic-line':{background:'#fce5dc'}})]})});view.current=editor;return()=>{editor.destroy();view.current=null;};
 // Preserve the CodeMirror document and cursor across runtime / Wiki renders.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 useEffect(()=>{const v=view.current;if(v&&v.state.doc.toString()!==source)v.dispatch({changes:{from:0,to:v.state.doc.length,insert:source}});},[source]);
 useEffect(()=>{view.current?.dispatch({effects:locked.current.reconfigure(EditorState.readOnly.of(readOnly))});},[readOnly]);
 useEffect(()=>{view.current?.dispatch({effects:mark.of({line,error})});},[line,error]);
 return <div className="program-editor" ref={host}/>;
}
