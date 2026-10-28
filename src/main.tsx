import UnoApp from './uno/UnoApp';
import {pageBoardId} from './boards/registry';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import WikiProvider from './wiki/WikiProvider';
import './styles.css';
document.title=(pageBoardId==='uno-r3'?'UNO R3':'ESP32')+' · 3D Interactive Lab';
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><WikiProvider>{pageBoardId==='uno-r3'?<UnoApp/>:<App/>}</WikiProvider></React.StrictMode>);
