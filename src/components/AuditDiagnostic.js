import React, { useState, useEffect } from 'react';
import useAuditLog from '../hooks/useAuditLog';

const AuditDiagnostic = ({ projectId, useSupabase = false }) => {
  const [diagnosticData, setDiagnosticData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  
  // Hook de auditoría para diagnóstico
  const { 
    auditLog, 
    isLoading: auditLoading, 
    addAuditEvent,
    logFinancialEvent 
  } = useAuditLog(projectId, useSupabase);

  useEffect(() => {
    const runDiagnostic = async () => {
      setIsLoading(true);
      
      try {
        // Verificar localStorage
        const localStorageKey = `audit-log-${projectId}`;
        const localStorageData = localStorage.getItem(localStorageKey);
        
        // Verificar si el hook está funcionando
        const hookWorking = typeof addAuditEvent === 'function' && typeof logFinancialEvent === 'function';
        
        // Verificar datos existentes
        const existingLogs = localStorageData ? JSON.parse(localStorageData) : [];
        
        // Probar crear un evento de prueba
        let testEventCreated = false;
        if (hookWorking && projectId) {
          try {
            const testEvent = await addAuditEvent({
              category: 'diagnostic',
              action: 'test-event',
              description: 'Evento de prueba para diagnóstico',
              details: { test: true },
              severity: 'low',
              user: 'Sistema'
            });
            testEventCreated = !!testEvent;
          } catch (error) {
            console.error('Error creando evento de prueba:', error);
          }
        }
        
        setDiagnosticData({
          projectId,
          localStorageKey,
          localStorageDataExists: !!localStorageData,
          localStorageDataLength: existingLogs.length,
          hookWorking,
          auditLogLength: auditLog.length,
          auditLoading,
          testEventCreated,
          localStorageContent: existingLogs,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error('Error en diagnóstico:', error);
        setDiagnosticData({
          error: error.message,
          timestamp: new Date().toISOString()
        });
      } finally {
        setIsLoading(false);
      }
    };

    runDiagnostic();
  }, [projectId, addAuditEvent, logFinancialEvent, auditLog, auditLoading]);

  const clearTestEvents = () => {
    if (projectId) {
      const localStorageKey = `audit-log-${projectId}`;
      const existingData = localStorage.getItem(localStorageKey);
      
      if (existingData) {
        const logs = JSON.parse(existingData);
        const filteredLogs = logs.filter(log => log.category !== 'diagnostic');
        localStorage.setItem(localStorageKey, JSON.stringify(filteredLogs));
        
        // Recargar la página para ver los cambios
        window.location.reload();
      }
    }
  };

  if (isLoading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
          <span className="text-blue-800">Ejecutando diagnóstico...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">🔍 Diagnóstico del Sistema de Auditoría</h3>
        <span className="text-sm text-gray-500">
          {new Date(diagnosticData.timestamp).toLocaleString()}
        </span>
      </div>

      {diagnosticData.error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-red-500 text-xl mr-2">❌</span>
            <div>
              <h4 className="font-semibold text-red-800">Error en Diagnóstico</h4>
              <p className="text-red-700">{diagnosticData.error}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Estado del Hook */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">🔧 Estado del Hook useAuditLog</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Project ID:</span>
                <span className="ml-2 text-gray-600">{diagnosticData.projectId || 'No definido'}</span>
              </div>
              <div>
                <span className="font-medium">Hook funcionando:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                  diagnosticData.hookWorking ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {diagnosticData.hookWorking ? '✅ Sí' : '❌ No'}
                </span>
              </div>
              <div>
                <span className="font-medium">Audit Log Length:</span>
                <span className="ml-2 text-gray-600">{diagnosticData.auditLogLength}</span>
              </div>
              <div>
                <span className="font-medium">Cargando:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                  diagnosticData.auditLoading ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                }`}>
                  {diagnosticData.auditLoading ? '⏳ Sí' : '✅ No'}
                </span>
              </div>
            </div>
          </div>

          {/* Estado de localStorage */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">💾 Estado de localStorage</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Clave:</span>
                <span className="ml-2 text-gray-600 font-mono">{diagnosticData.localStorageKey}</span>
              </div>
              <div>
                <span className="font-medium">Datos existen:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                  diagnosticData.localStorageDataExists ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {diagnosticData.localStorageDataExists ? '✅ Sí' : '❌ No'}
                </span>
              </div>
              <div>
                <span className="font-medium">Eventos guardados:</span>
                <span className="ml-2 text-gray-600">{diagnosticData.localStorageDataLength}</span>
              </div>
              <div>
                <span className="font-medium">Evento de prueba creado:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                  diagnosticData.testEventCreated ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {diagnosticData.testEventCreated ? '✅ Sí' : '❌ No'}
                </span>
              </div>
            </div>
          </div>

          {/* Eventos Existentes */}
          {diagnosticData.localStorageContent && diagnosticData.localStorageContent.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-2">📋 Eventos de Auditoría Existentes</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {diagnosticData.localStorageContent.map((event, index) => (
                  <div key={index} className="bg-white border rounded p-3 text-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">
                          {event.category} - {event.action}
                        </div>
                        <div className="text-gray-600">{event.description}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(event.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        event.severity === 'high' ? 'bg-red-100 text-red-800' :
                        event.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {event.severity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Acciones */}
          <div className="flex space-x-3">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              🔄 Actualizar Diagnóstico
            </button>
            {diagnosticData.localStorageContent && diagnosticData.localStorageContent.some(e => e.category === 'diagnostic') && (
              <button
                onClick={clearTestEvents}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                🧹 Limpiar Eventos de Prueba
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditDiagnostic;
