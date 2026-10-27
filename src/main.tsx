import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import WikiProvider from './wiki/WikiProvider';
import './styles.css';
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><WikiProvider><App /></WikiProvider></React.StrictMode>);
