import React, { useState, useEffect } from 'react';
import { Save, Cloud, AlertCircle, CheckCircle, Clock } from 'lucide-react';

const FileStatusIndicator = () => {
  const [status, setStatus] = useState({
    isInitialized: false,
    isSyncing: false,
    lastSave: null,
    lastBackup: null,
    error: null
  });

  useEffect(() => {
    // Escuchar eventos del servicio de persistencia
    const handleFileDataSaved = (event) => {
      setStatus(prev => ({
        ...prev,
        lastSave: event.detail.timestamp,
        error: null
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
        error: null
      }));
    };

    const handleError = (event) => {
      setStatus(prev => ({
        ...prev,
        error: event.detail.message
      }));
    };

    // Registrar event listeners
    window.addEventListener('fileDataSaved', handleFileDataSaved);
    window.addEventListener('autoBackupCreated', handleAutoBackupCreated);
    window.addEventListener('fileDataImported', handleFileDataImported);
    window.addEventListener('filePersistenceError', handleError);

    // Simular inicialización
    setTimeout(() => {
      setStatus(prev => ({
        ...prev,
        isInitialized: true,
        isSyncing: true
      }));
    }, 1000);

    return () => {
      window.removeEventListener('fileDataSaved', handleFileDataSaved);
      window.removeEventListener('autoBackupCreated', handleAutoBackupCreated);
      window.removeEventListener('fileDataImported', handleFileDataImported);
      window.removeEventListener('filePersistenceError', handleError);
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
    if (status.isInitialized && status.isSyncing) return 'text-green-600';
    if (status.isInitialized) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getStatusIcon = () => {
    if (status.error) return <AlertCircle className="w-4 h-4" />;
    if (status.isInitialized && status.isSyncing) return <CheckCircle className="w-4 h-4" />;
    if (status.isInitialized) return <Clock className="w-4 h-4" />;
    return <Cloud className="w-4 h-4" />;
  };

  const getStatusText = () => {
    if (status.error) return 'Error en archivos';
    if (status.isInitialized && status.isSyncing) return 'Sincronizando';
    if (status.isInitialized) return 'Inicializado';
    return 'Conectando...';
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
            <div>💾 {formatTime(status.lastSave)}</div>
            {status.lastBackup && (
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
