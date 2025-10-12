import React, { useState, useEffect } from 'react';

const BackupManager = ({ projects, workPackagesByProject, risksByProject, tasksByProject, purchaseOrdersByProject, advancesByProject, invoicesByProject, contractsByProject, globalResources, resourceAssignmentsByProject, viewMode, currentProjectId }) => {
  const [backups, setBackups] = useState([]);
  const [showBackupManager, setShowBackupManager] = useState(false);

  // Cargar backups existentes al montar el componente
  useEffect(() => {
    loadBackups();
  }, []);

  // ELIMINADO: Backup automático - ahora solo se usan backups manuales y auto-save

  const loadBackups = () => {
    const savedBackups = localStorage.getItem('mi-dashboard-backups');
    if (savedBackups) {
      try {
        setBackups(JSON.parse(savedBackups));
      } catch (error) {
        console.error('Error cargando backups:', error);
      }
    }
  };

  const saveBackups = (newBackups) => {
    localStorage.setItem('mi-dashboard-backups', JSON.stringify(newBackups));
    setBackups(newBackups);
  };

  const createBackup = (isAutomatic = false) => {
    const timestamp = new Date().toISOString();
    const backupData = {
      id: `backup-${Date.now()}`,
      name: isAutomatic ? `Backup Automático - ${new Date().toLocaleString()}` : `Backup Manual - ${new Date().toLocaleString()}`,
      timestamp,
      data: {
        projects,
        currentProjectId,
        workPackagesByProject,
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
      size: JSON.stringify({
        projects,
        workPackagesByProject,
        risksByProject,
        tasksByProject,
        purchaseOrdersByProject,
        advancesByProject,
        invoicesByProject,
        contractsByProject,
        globalResources,
        resourceAssignmentsByProject
      }).length,
      isAutomatic
    };

    // Crear archivo de respaldo descargable
    const fileName = `mi-dashboard-backup-${new Date().toISOString().split('T')[0]}-${Date.now()}.json`;
    const dataStr = JSON.stringify(backupData.data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    // Crear enlace de descarga automática
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    const newBackups = [backupData, ...backups].slice(0, 10); // Mantener solo los últimos 10 backups
    saveBackups(newBackups);

    // Disparar evento de backup creado
    const backupEvent = new CustomEvent('backupCreated', {
      detail: { backupId: backupData.id, isAutomatic, timestamp, fileName }
    });
    window.dispatchEvent(backupEvent);

    return backupData;
  };

  const createAutomaticBackup = () => {
    createBackup(true);
  };

  const restoreBackup = (backupId) => {
    const backup = backups.find(b => b.id === backupId);
    if (!backup) return;

    if (window.confirm(`¿Está seguro de restaurar el backup "${backup.name}"? Esto reemplazará todos los datos actuales.`)) {
      // Restaurar datos
      const { data } = backup;
      
      // Disparar evento de restauración
      const restoreEvent = new CustomEvent('dataRestore', {
        detail: { 
          backupId, 
          backupName: backup.name,
          timestamp: new Date().toISOString(),
          data 
        }
      });
      window.dispatchEvent(restoreEvent);

      alert(`✅ Backup "${backup.name}" restaurado exitosamente. Recarga la página para ver los cambios.`);
    }
  };

  const deleteBackup = (backupId) => {
    if (window.confirm('¿Está seguro de eliminar este backup?')) {
      const newBackups = backups.filter(b => b.id !== backupId);
      saveBackups(newBackups);
    }
  };

  const importBackup = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const importedData = JSON.parse(e.target.result);
            
            if (window.confirm('¿Está seguro de importar este backup? Esto reemplazará todos los datos actuales.')) {
              // Disparar evento de importación
              const importEvent = new CustomEvent('dataImport', {
                detail: { 
                  fileName: file.name,
                  timestamp: new Date().toISOString(),
                  data: importedData 
                }
              });
              window.dispatchEvent(importEvent);

              alert(`✅ Backup "${file.name}" importado exitosamente. Recarga la página para ver los cambios.`);
            }
          } catch (error) {
            alert('❌ Error al importar el backup. Verifique que el archivo sea válido.');
            console.error('Error importing backup:', error);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (!showBackupManager) {
    return null; // Botón de backups removido - ahora se usa el indicador de nube en su lugar
    // return (
    //   <button
    //     onClick={() => setShowBackupManager(true)}
    //     className="fixed bottom-4 left-4 bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-purple-700 transition-colors z-40"
    //     title="Gestionar Backups"
    //   >
    //     💾 Backups ({backups.length})
    //   </button>
    // );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">💾 Gestión de Backups</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => createBackup(false)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              📥 Crear Backup Manual
            </button>
            <button
              onClick={importBackup}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              📤 Importar Backup
            </button>
            <button
              onClick={() => setShowBackupManager(false)}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              ✕ Cerrar
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {backups.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-4">💾</div>
              <div>No hay backups disponibles</div>
              <div className="text-sm mt-2">Los backups automáticos se crean cada 30 minutos</div>
            </div>
          ) : (
            <div className="space-y-4">
              {backups.map((backup) => (
                <div key={backup.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-gray-800">{backup.name}</h3>
                        {backup.isAutomatic && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            Automático
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        <div>📅 {formatDate(backup.timestamp)}</div>
                        <div>📊 {formatFileSize(backup.size)}</div>
                        <div>🆔 {backup.id}</div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => restoreBackup(backup.id)}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
                        title="Restaurar este backup"
                      >
                        🔄 Restaurar
                      </button>
                      <button
                        onClick={() => deleteBackup(backup.id)}
                        className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
                        title="Eliminar este backup"
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <span>📊 Total de backups: {backups.length}</span>
              <span>🔄 Backups automáticos cada 30 minutos</span>
              <span>💾 Máximo 10 backups guardados</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BackupManager;
