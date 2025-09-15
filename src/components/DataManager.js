import React, { useState, useRef } from 'react';

const DataManager = ({ 
  projects, 
  risksByProject, 
  tasksByProject, 
  purchaseOrdersByProject, 
  advancesByProject, 
  invoicesByProject, 
  contractsByProject, 
  globalResources, 
  resourceAssignmentsByProject, 
  viewMode, 
  currentProjectId,
  onDataImport 
}) => {
  const [showDataManager, setShowDataManager] = useState(false);
  const [importStatus, setImportStatus] = useState(null);
  const fileInputRef = useRef(null);

  const exportData = () => {
    const exportData = {
      version: '2.0',
      exportDate: new Date().toISOString(),
      data: {
        projects,
        currentProjectId,
        risksByProject,
        tasksByProject,
        purchaseOrdersByProject,
        advancesByProject,
        invoicesByProject,
        contractsByProject,
        globalResources,
        resourceAssignmentsByProject,
        viewMode
      },
      metadata: {
        totalProjects: projects?.length || 0,
        totalRisks: Object.values(risksByProject || {}).flat().length,
        totalTasks: Object.values(tasksByProject || {}).flat().length,
        totalResources: globalResources?.length || 0,
        dataSize: JSON.stringify({
          projects,
          risksByProject,
          tasksByProject,
          purchaseOrdersByProject,
          advancesByProject,
          invoicesByProject,
          contractsByProject,
          globalResources,
          resourceAssignmentsByProject
        }).length
      }
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mi-dashboard-export-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);

    // Disparar evento de exportación
    const exportEvent = new CustomEvent('dataExported', {
      detail: { 
        timestamp: new Date().toISOString(),
        dataSize: dataStr.length,
        totalProjects: projects?.length || 0
      }
    });
    window.dispatchEvent(exportEvent);
  };

  const handleFileImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setImportStatus({ type: 'error', message: 'Solo se permiten archivos JSON' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        
        // Validar estructura del archivo
        if (!importedData.version || !importedData.data) {
          throw new Error('Formato de archivo inválido');
        }

        if (importedData.version !== '2.0') {
          setImportStatus({ 
            type: 'warning', 
            message: `Versión del archivo: ${importedData.version}. Puede haber incompatibilidades.` 
          });
        }

        // Confirmar importación
        if (window.confirm(`¿Está seguro de importar los datos?\n\nEsto reemplazará TODOS los datos actuales.\n\nProyectos en el archivo: ${importedData.metadata?.totalProjects || 'N/A'}\nFecha de exportación: ${importedData.exportDate ? new Date(importedData.exportDate).toLocaleString() : 'N/A'}`)) {
          
          // Disparar evento de importación
          const importEvent = new CustomEvent('dataImport', {
            detail: { 
              timestamp: new Date().toISOString(),
              importedData: importedData.data,
              metadata: importedData.metadata
            }
          });
          window.dispatchEvent(importEvent);

          // Llamar función de importación del padre
          if (onDataImport) {
            onDataImport(importedData.data);
          }

          setImportStatus({ 
            type: 'success', 
            message: `Datos importados exitosamente. ${importedData.metadata?.totalProjects || 0} proyectos cargados.` 
          });

          // Cerrar modal después de 3 segundos
          setTimeout(() => {
            setShowDataManager(false);
            setImportStatus(null);
          }, 3000);
        }
      } catch (error) {
        setImportStatus({ 
          type: 'error', 
          message: `Error al importar: ${error.message}` 
        });
      }
    };

    reader.readAsText(file);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!showDataManager) {
    return (
      <button
        onClick={() => setShowDataManager(true)}
        className="fixed bottom-4 right-4 bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-indigo-700 transition-colors z-40"
        title="Gestionar Datos"
      >
        📁 Datos
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">📁 Gestión de Datos</h2>
          <button
            onClick={() => {
              setShowDataManager(false);
              setImportStatus(null);
            }}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
          >
            ✕ Cerrar
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Estado de Importación */}
          {importStatus && (
            <div className={`p-4 rounded-lg ${
              importStatus.type === 'success' ? 'bg-green-100 text-green-800' :
              importStatus.type === 'error' ? 'bg-red-100 text-red-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              <div className="flex items-center space-x-2">
                <span className="text-xl">
                  {importStatus.type === 'success' ? '✅' : 
                   importStatus.type === 'error' ? '❌' : '⚠️'}
                </span>
                <span>{importStatus.message}</span>
              </div>
            </div>
          )}

          {/* Resumen de Datos Actuales */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">📊 Datos Actuales</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Proyectos:</span> {projects?.length || 0}
              </div>
              <div>
                <span className="font-medium">Riesgos:</span> {Object.values(risksByProject || {}).flat().length}
              </div>
              <div>
                <span className="font-medium">Tareas:</span> {Object.values(tasksByProject || {}).flat().length}
              </div>
              <div>
                <span className="font-medium">Recursos:</span> {globalResources?.length || 0}
              </div>
              <div>
                <span className="font-medium">Tamaño:</span> {formatFileSize(JSON.stringify({
                  projects,
                  risksByProject,
                  tasksByProject,
                  purchaseOrdersByProject,
                  advancesByProject,
                  invoicesByProject,
                  contractsByProject,
                  globalResources,
                  resourceAssignmentsByProject
                }).length)}
              </div>
            </div>
          </div>

          {/* Exportar Datos */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">📤 Exportar Datos</h3>
            <p className="text-gray-600 text-sm">
              Exporta todos tus datos como archivo JSON para respaldo o transferencia.
            </p>
            <button
              onClick={exportData}
              className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
            >
              <span>📥</span>
              <span>Exportar Datos Completos</span>
            </button>
          </div>

          {/* Importar Datos */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">📥 Importar Datos</h3>
            <p className="text-gray-600 text-sm">
              Importa datos desde un archivo JSON. <strong>Esto reemplazará todos los datos actuales.</strong>
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
            >
              <span>📤</span>
              <span>Seleccionar Archivo JSON</span>
            </button>
          </div>

          {/* Información Adicional */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">ℹ️ Información Importante</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Los datos se guardan automáticamente en el navegador</li>
              <li>• Los backups automáticos se crean cada 30 minutos</li>
              <li>• La exportación incluye todos los proyectos y configuraciones</li>
              <li>• La importación reemplaza completamente los datos actuales</li>
              <li>• Se recomienda hacer backup antes de importar</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataManager;
