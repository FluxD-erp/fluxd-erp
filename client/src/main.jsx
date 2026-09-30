import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
// Registro manual do Service Worker — versão customizada em public/registerSW.js
// que NÃO força reload em abas abertas quando há update (resolve bug de
// recarga ao trocar de aba). Estratégia: aplica no próximo reload natural.
import '../public/registerSW.js';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
