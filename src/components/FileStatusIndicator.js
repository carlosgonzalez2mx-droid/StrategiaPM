import React, { useState, useEffect } from 'react';
import { Save, Cloud, AlertCircle, CheckCircle, Clock, Database } from 'lucide-react';

const FileStatusIndicator = () => {
  const [status, setStatus] = useState({
    isInitialized: false,
    isSyncing: false,
    lastSave: null,
    lastBackup: null,
    error: null,
    isUsingSupabase: false,
    supabaseConnected: false
  });

  useEffect(() => {
    // Escuchar eventos del servicio de persistencia local
    const handleFileDataSaved = (event) => {
      setStatus(prev => ({
        ...prev,
        lastSave: event.detail.timestamp,
        error: null,
        isSyncing: false
      }));
    };

    const handleAutoBackupCreated = (event) => {
      setStatus(prev => ({
        ...prev,
        lastBackup: event.detail.timestamp,
        error: null
      }));
    };

    const handleFileDataImported = (event) => {
      setStatus(prev => ({
        ...prev,
        lastSave: event.detail.timestamp,
        error: null,
        isSyncing: false
      }));
    };

    const handleError = (event) => {
      setStatus(prev => ({
        ...prev,
        error: event.detail.message,
        isSyncing: false
      }));
    };

    // Escuchar eventos de Supabase
    const handleSupabaseDataSaved = (event) => {
      setStatus(prev => ({
        ...prev,
        lastSave: event.detail.timestamp,
        error: null,
        isSyncing: false,
        isUsingSupabase: true,
        supabaseConnected: true
      }));
    };

    const handleSupabaseError = (event) => {
      setStatus(prev => ({
        ...prev,
        error: event.detail.message,
        isSyncing: false,
        isUsingSupabase: true
      }));
    };

    const handleSupabaseSyncing = (event) => {
      setStatus(prev => ({
        ...prev,
        isSyncing: true,
        isUsingSupabase: true,
        error: null
      }));
    };

    // Detectar si se está usando Supabase
    const detectSupabaseUsage = () => {
      // Verificar múltiples fuentes para detectar uso de Supabase
      const useSupabase = localStorage.getItem('useSupabase') === 'true' || 
                         window.location.search.includes('supabase=true') ||
                         document.querySelector('[data-supabase-active]') ||
                         window.supabaseActive === true;
      
      setStatus(prev => ({
        ...prev,
        isUsingSupabase: useSupabase
      }));
    };

    // También detectar cuando cambie el estado de Supabase
    const handleSupabaseStatusChange = () => {
      detectSupabaseUsage();
    };

    // Escuchar cambios en localStorage
    window.addEventListener('storage', handleSupabaseStatusChange);

    // Registrar event listeners
    window.addEventListener('fileDataSaved', handleFileDataSaved);
    window.addEventListener('autoBackupCreated', handleAutoBackupCreated);
    window.addEventListener('fileDataImported', handleFileDataImported);
    window.addEventListener('filePersistenceError', handleError);
    
    // Eventos de Supabase
    window.addEventListener('supabaseDataSaved', handleSupabaseDataSaved);
    window.addEventListener('supabaseError', handleSupabaseError);
    window.addEventListener('supabaseSyncing', handleSupabaseSyncing);

    // Detectar uso de Supabase y simular inicialización
    detectSupabaseUsage();
    setTimeout(() => {
      setStatus(prev => ({
        ...prev,
        isInitialized: true,
        isSyncing: !prev.isUsingSupabase // Solo mostrar sincronizando si NO usa Supabase
      }));
    }, 1000);

    return () => {
      window.removeEventListener('fileDataSaved', handleFileDataSaved);
      window.removeEventListener('autoBackupCreated', handleAutoBackupCreated);
      window.removeEventListener('fileDataImported', handleFileDataImported);
      window.removeEventListener('filePersistenceError', handleError);
      
      // Remover eventos de Supabase
      window.removeEventListener('supabaseDataSaved', handleSupabaseDataSaved);
      window.removeEventListener('supabaseError', handleSupabaseError);
      window.removeEventListener('supabaseSyncing', handleSupabaseSyncing);
      
      // Remover listener de storage
      window.removeEventListener('storage', handleSupabaseStatusChange);
    };
  }, []);

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Nunca';
    return new Date(timestamp).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusColor = () => {
    if (status.error) return 'text-red-600';
    if (status.isUsingSupabase && status.supabaseConnected) return 'text-green-600';
    if (status.isInitialized && status.isSyncing) return 'text-blue-600';
    if (status.isInitialized) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getStatusIcon = () => {
    if (status.error) return <AlertCircle className="w-4 h-4" />;
    if (status.isUsingSupabase && status.supabaseConnected) return <Database className="w-4 h-4" />;
    if (status.isInitialized && status.isSyncing) return <Cloud className="w-4 h-4" />;
    if (status.isInitialized) return <Clock className="w-4 h-4" />;
    return <Cloud className="w-4 h-4" />;
  };

  const getStatusText = () => {
    if (status.error) return status.isUsingSupabase ? 'Error en Supabase' : 'Error en archivos';
    if (status.isUsingSupabase && status.isSyncing) return 'Sincronizando con Supabase';
    if (status.isUsingSupabase && status.supabaseConnected) return 'Conectado a Supabase';
    if (status.isInitialized && status.isSyncing) return 'Sincronizando';
    if (status.isInitialized) return 'Inicializado';
    return 'Conectando...';
  };

  const getStorageIndicator = () => {
    if (status.isUsingSupabase) {
      return '☁️'; // Nube para Supabase
    }
    return '💾'; // Disco para archivos locales
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border p-3 z-40">
      <div className="flex items-center space-x-2">
        <div className={`flex items-center space-x-1 ${getStatusColor()}`}>
          {getStatusIcon()}
          <span className="text-sm font-medium">{getStatusText()}</span>
        </div>
        
        {status.isInitialized && (
          <div className="text-xs text-gray-500 ml-2">
            <div>{getStorageIndicator()} {formatTime(status.lastSave)}</div>
            {status.lastBackup && !status.isUsingSupabase && (
              <div>📦 {formatTime(status.lastBackup)}</div>
            )}
          </div>
        )}
      </div>
      
      {status.error && (
        <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
          {status.error}
        </div>
      )}
    </div>
  );
};

export default FileStatusIndicator;
