import {selectedBoardId} from './boards/selection';
import {lastPicoDraft} from './pico/storage';
import {lastPractice} from './practice/storage';
import UnoApp from './uno/UnoApp';
import {pageBoardId} from './boards/registry';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import WikiProvider from './wiki/WikiProvider';
import './styles.css';
const PicoApp=React.lazy(()=>import('./pico/PicoApp'));
document.title=(selectedBoardId==='pico-2-w'?'Pico 2 W · MicroPython':pageBoardId==='uno-r3'?'UNO R3':'ESP32')+' · 3D Interactive Lab';
const entry=new URL(location.href),isHome=!entry.searchParams.has('board')&&!entry.searchParams.has('lesson')&&!entry.hash;
let lastPico:ReturnType<typeof lastPicoDraft>=null;
if(isHome){try{lastPico=localStorage.getItem('interactive-lab-last-board-v1')==='pico-2-w'?lastPicoDraft():null;}catch{/* Invalid Pico draft does not prevent opening the app. */}}
const last=isHome&&!lastPico?lastPractice():null;
if(lastPico||last){entry.searchParams.set('board',lastPico?'pico-2-w':last!.boardId);entry.searchParams.set('lesson',lastPico?lastPico.lessonId:last!.lessonId);entry.hash='code';location.replace(entry.href);}else ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode>{selectedBoardId==='pico-2-w'?<React.Suspense fallback={<main><p role="status">正在載入 Pico MicroPython 實驗室…</p></main>}><PicoApp/></React.Suspense>:<WikiProvider>{pageBoardId==='uno-r3'?<UnoApp/>:<App/>}</WikiProvider>}</React.StrictMode>);
