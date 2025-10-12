import React, { useState, useEffect } from 'react';

const SyncIndicator = ({ useSupabase, supabaseInitialized, isAuthenticated }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [lastSave, setLastSave] = useState(null);
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    // Escuchar eventos de sincronización
    const handleDataSync = (event) => {
      setIsSyncing(true);
      setLastSync(new Date());
      
      // Ocultar indicador después de 2 segundos
      setTimeout(() => {
        setIsSyncing(false);
      }, 2000);
    };

    // Escuchar eventos de guardado
    const handleDataSave = (event) => {
      setIsSaving(true);
      setLastSave(new Date());
      
      // Ocultar indicador después de 1.5 segundos
      setTimeout(() => {
        setIsSaving(false);
      }, 1500);
    };

    // Escuchar cambios en datos
    const handleDataChange = () => {
      setShowIndicator(true);
      setTimeout(() => setShowIndicator(false), 3000);
    };

    window.addEventListener('dataSync', handleDataSync);
    window.addEventListener('dataSave', handleDataSave);
    window.addEventListener('dataChange', handleDataChange);

    return () => {
      window.removeEventListener('dataSync', handleDataSync);
      window.removeEventListener('dataSave', handleDataSave);
      window.removeEventListener('dataChange', handleDataChange);
    };
  }, []);

  // Mostrar indicador de estado de Supabase siempre
  const showSupabaseStatus = useSupabase !== undefined;

  if (!showIndicator && !isSyncing && !isSaving && !showSupabaseStatus) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 space-y-2">
      {/* Indicador de Guardado */}
      {isSaving && (
        <div className="flex items-center space-x-2 px-4 py-2 rounded-lg shadow-lg bg-orange-500 text-white transition-all duration-300">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
          <span className="text-sm font-medium">Guardando...</span>
        </div>
      )}
      
      {/* Indicador de Sincronización */}
      {isSyncing && (
        <div className="flex items-center space-x-2 px-4 py-2 rounded-lg shadow-lg bg-blue-500 text-white transition-all duration-300">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
          <span className="text-sm font-medium">Sincronizando...</span>
        </div>
      )}
      
      {/* Indicador de Estado de Supabase */}
      {showSupabaseStatus && !isSyncing && !isSaving && (
        <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg shadow-lg text-white transition-all duration-300 ${
          useSupabase && isAuthenticated ? 'bg-green-500' : 
          useSupabase && !isAuthenticated ? 'bg-yellow-500' : 
          'bg-gray-500'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            useSupabase && isAuthenticated ? 'bg-white' : 
            useSupabase && !isAuthenticated ? 'bg-orange-300' : 
            'bg-white'
          }`}></div>
          <span className="text-sm font-medium">
            {useSupabase && isAuthenticated ? '☁️ Nube' : 
             useSupabase && !isAuthenticated ? '⚠️ Sin autenticar' : 
             '💾 Local'}
          </span>
        </div>
      )}
      
      {/* Indicador de Estado */}
      {!isSyncing && !isSaving && showIndicator && (
        <div className="flex items-center space-x-2 px-4 py-2 rounded-lg shadow-lg bg-green-500 text-white transition-all duration-300">
          <div className="w-2 h-2 bg-white rounded-full"></div>
          <span className="text-sm font-medium">
            Guardado {lastSave && `(${lastSave.toLocaleTimeString()})`}
          </span>
        </div>
      )}
    </div>
  );
};

export default SyncIndicator;
