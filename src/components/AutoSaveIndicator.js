import React, { useState, useEffect } from 'react';

const AutoSaveIndicator = () => {
  const [status, setStatus] = useState('idle'); // idle, saving, saved, error
  const [lastSaveTime, setLastSaveTime] = useState(null);
  
  useEffect(() => {
    // Escuchar eventos de auto-guardado
    const handleAutoSave = (event) => {
      setStatus('saving');
      
      setTimeout(() => {
        setStatus('saved');
        setLastSaveTime(new Date());
        
        // Volver a idle después de 3 segundos
        setTimeout(() => setStatus('idle'), 3000);
      }, event.detail?.duration || 1000);
    };
    
    const handleSaveStart = () => setStatus('saving');
    const handleSaveComplete = (event) => {
      setStatus('saved');
      setLastSaveTime(new Date());
      setTimeout(() => setStatus('idle'), 3000);
    };
    const handleSaveError = () => {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 5000);
    };
    
    window.addEventListener('autoSaveStart', handleSaveStart);
    window.addEventListener('autoSaveComplete', handleSaveComplete);
    window.addEventListener('autoSaveError', handleSaveError);
    window.addEventListener('supabaseSyncing', handleSaveStart);
    window.addEventListener('supabaseSynced', handleSaveComplete);
    
    return () => {
      window.removeEventListener('autoSaveStart', handleSaveStart);
      window.removeEventListener('autoSaveComplete', handleSaveComplete);
      window.removeEventListener('autoSaveError', handleSaveError);
      window.removeEventListener('supabaseSyncing', handleSaveStart);
      window.removeEventListener('supabaseSynced', handleSaveComplete);
    };
  }, []);
  
  const formatTime = (date) => {
    if (!date) return '';
    return date.toLocaleTimeString('es-MX', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };
  
  if (status === 'idle' && !lastSaveTime) {
    return null;
  }
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`
        px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2
        transition-all duration-300 ease-in-out
        ${status === 'saving' ? 'bg-blue-500 text-white' : ''}
        ${status === 'saved' ? 'bg-green-500 text-white' : ''}
        ${status === 'error' ? 'bg-red-500 text-white' : ''}
        ${status === 'idle' ? 'bg-gray-200 text-gray-600' : ''}
      `}>
        {status === 'saving' && (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <span>Guardando...</span>
          </>
        )}
        
        {status === 'saved' && (
          <>
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
            </svg>
            <span>Guardado</span>
          </>
        )}
        
        {status === 'error' && (
          <>
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
            </svg>
            <span>Error al guardar</span>
          </>
        )}
        
        {status === 'idle' && lastSaveTime && (
          <span className="text-sm">
            Guardado a las {formatTime(lastSaveTime)}
          </span>
        )}
      </div>
    </div>
  );
};

export default AutoSaveIndicator;

