import React, { useState, useEffect } from 'react';
import supabaseService from '../services/SupabaseService';

const AutoBackupIndicator = ({ className = '' }) => {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [lastBackup, setLastBackup] = useState(null);
  const [showNotification, setShowNotification] = useState(false);
  const [backupFrequency, setBackupFrequency] = useState(30); // minutos

  // Cargar configuración de backup automático
  useEffect(() => {
    const savedFrequency = localStorage.getItem('strategiapm_auto_backup_frequency');
    if (savedFrequency) {
      setBackupFrequency(parseInt(savedFrequency));
    }

    const savedLastBackup = localStorage.getItem('strategiapm_last_backup');
    if (savedLastBackup) {
      setLastBackup(new Date(savedLastBackup));
    }
  }, []);

  // Función para realizar backup automático silencioso
  const performAutoBackup = async () => {
    if (isBackingUp) return;

    try {
      setIsBackingUp(true);
      console.log('🔄 Iniciando backup automático silencioso...');
      
      const result = await supabaseService.createSilentBackup();
      
      if (result.success) {
        setLastBackup(new Date());
        localStorage.setItem('strategiapm_last_backup', new Date().toISOString());
        
        // Mostrar notificación discreta
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 3000);
        
        console.log(`✅ Backup automático completado: ${result.recordCount} registros`);
      } else {
        console.warn('⚠️ Error en backup automático:', result.error);
      }
    } catch (error) {
      console.error('❌ Error inesperado en backup automático:', error);
    } finally {
      setIsBackingUp(false);
    }
  };

  // Configurar intervalo de backup automático
  useEffect(() => {
    const intervalMs = backupFrequency * 60 * 1000; // Convertir minutos a milisegundos
    
    const interval = setInterval(() => {
      // Solo hacer backup si no está en proceso y hay datos
      if (!isBackingUp) {
        performAutoBackup();
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [backupFrequency, isBackingUp]);

  // Calcular tiempo hasta próximo backup
  const getNextBackupTime = () => {
    if (!lastBackup) return null;
    
    const nextBackup = new Date(lastBackup.getTime() + (backupFrequency * 60 * 1000));
    const now = new Date();
    
    if (nextBackup <= now) return null;
    
    const diffMs = nextBackup - now;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return '< 1 min';
    if (diffMinutes < 60) return `${diffMinutes} min`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    return `${diffHours}h ${diffMinutes % 60}m`;
  };

  const nextBackupTime = getNextBackupTime();

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Indicador de estado */}
      <div className="flex items-center space-x-1">
        <div className={`w-2 h-2 rounded-full ${
          isBackingUp 
            ? 'bg-blue-500 animate-pulse' 
            : lastBackup 
              ? 'bg-green-500' 
              : 'bg-gray-400'
        }`} />
        
        <span className="text-xs text-gray-500">
          {isBackingUp 
            ? 'Backup...' 
            : lastBackup 
              ? 'Auto-backup' 
              : 'Sin backup'
          }
        </span>
      </div>

      {/* Tiempo hasta próximo backup */}
      {nextBackupTime && !isBackingUp && (
        <span className="text-xs text-gray-400">
          ({nextBackupTime})
        </span>
      )}

      {/* Notificación de backup completado */}
      {showNotification && (
        <div className="absolute top-0 right-0 bg-green-100 border border-green-300 text-green-700 px-3 py-1 rounded-lg text-xs shadow-lg z-50">
          ✅ Backup automático completado
        </div>
      )}

      {/* Configuración de frecuencia (hover) */}
      <div className="group relative">
        <button
          className="text-gray-400 hover:text-gray-600 text-xs"
          title="Configurar backup automático"
        >
          ⚙️
        </button>
        
        <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-64 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto">
          <div className="text-xs text-gray-600 mb-2">
            <strong>Backup Automático</strong>
          </div>
          
          <div className="text-xs text-gray-500 mb-2">
            Frecuencia: cada {backupFrequency} minutos
          </div>
          
          <div className="flex items-center space-x-2 mb-2">
            <label className="text-xs text-gray-500">Cada:</label>
            <select
              value={backupFrequency}
              onChange={(e) => {
                const newFreq = parseInt(e.target.value);
                setBackupFrequency(newFreq);
                localStorage.setItem('strategiapm_auto_backup_frequency', newFreq.toString());
              }}
              className="text-xs border border-gray-300 rounded px-1 py-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              <option value={5}>5 min</option>
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={60}>1 hora</option>
              <option value={120}>2 horas</option>
              <option value={0}>Desactivado</option>
            </select>
          </div>
          
          {lastBackup && (
            <div className="text-xs text-gray-500">
              Último: {lastBackup.toLocaleTimeString()}
            </div>
          )}
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              performAutoBackup();
            }}
            disabled={isBackingUp}
            className="mt-2 w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white text-xs px-2 py-1 rounded"
          >
            {isBackingUp ? 'Backup...' : 'Backup Ahora'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AutoBackupIndicator;
