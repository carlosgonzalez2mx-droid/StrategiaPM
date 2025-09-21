import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
// import './debug-logger.js'; // Debug logger para capturar todos los logs - Comentado para producción
import supabaseService from './services/SupabaseService';

// Hacer supabaseService disponible globalmente para debugging
window.supabaseService = supabaseService;

// Debug function para verificar estado de la app
window.debugAppState = () => {
  console.log('=== DEBUG APP STATE ===');
  console.log('Supabase service:', window.supabaseService);
  console.log('Current user:', window.supabaseService?.getCurrentUser());
  console.log('Current organization:', window.supabaseService?.getCurrentOrganization());
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
