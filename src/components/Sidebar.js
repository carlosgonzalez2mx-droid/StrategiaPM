import React from 'react';
import supabaseService from '../services/SupabaseService';
import AutoBackupIndicator from './AutoBackupIndicator';

const Sidebar = ({ 
  activeSection, 
  onSectionChange,
  projects,
  currentProjectId,
  setCurrentProjectId,
  workPackages = [], // Nuevo prop para work packages
  risks = [], // Nuevo prop para riesgos
  evmMetrics = {}, // Nuevo prop para métricas EVM
  isCollapsed = false, // Prop para estado colapsado
  onToggleCollapse // Función para alternar el estado
}) => {
  
  // Estado para el backup
  const [isBackingUp, setIsBackingUp] = React.useState(false);
  const [backupStats, setBackupStats] = React.useState(null);
  
  // Estado para restauración
  const [showRestoreModal, setShowRestoreModal] = React.useState(false);
  const [restoreFile, setRestoreFile] = React.useState(null);
  const [restorePreview, setRestorePreview] = React.useState(null);
  const [isRestoring, setIsRestoring] = React.useState(false);
  
  // Función para crear backup de la base de datos
  const handleDatabaseBackup = async () => {
    try {
      setIsBackingUp(true);
      console.log('🔄 Iniciando backup de base de datos...');
      
      const result = await supabaseService.createDatabaseBackup();
      
      if (result.success) {
        console.log(`✅ Backup exitoso: ${result.fileName}`);
        console.log(`📊 Registros respaldados: ${result.recordCount} de ${result.tables} tablas`);
        
        // Mostrar notificación de éxito
        alert(`✅ Backup completado exitosamente!\n\nArchivo: ${result.fileName}\nRegistros: ${result.recordCount}\nTablas: ${result.tables}`);
      } else {
        console.error('❌ Error en backup:', result.error);
        alert(`❌ Error al crear backup:\n${result.error}`);
      }
    } catch (error) {
      console.error('❌ Error inesperado en backup:', error);
      alert(`❌ Error inesperado:\n${error.message}`);
    } finally {
      setIsBackingUp(false);
    }
  };

  // Función para manejar selección de archivo de backup
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Verificar que sea un archivo JSON
    if (!file.name.endsWith('.json')) {
      alert('❌ Error: El archivo debe ser un archivo JSON (.json)');
      return;
    }

    setRestoreFile(file);

    // Leer y validar el archivo
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const backupData = JSON.parse(e.target.result);
        const preview = supabaseService.getBackupPreview(backupData);
        
        if (preview.success) {
          setRestorePreview(preview);
          console.log('✅ Archivo de backup válido:', preview);
        } else {
          alert(`❌ Error validando archivo: ${preview.error}`);
          setRestoreFile(null);
          setRestorePreview(null);
        }
      } catch (error) {
        alert(`❌ Error leyendo archivo: ${error.message}`);
        setRestoreFile(null);
        setRestorePreview(null);
      }
    };
    
    reader.readAsText(file);
  };

  // Función para restaurar backup
  const handleRestoreBackup = async () => {
    if (!restoreFile || !restorePreview) {
      alert('❌ Error: No hay archivo seleccionado o archivo inválido');
      return;
    }

    // Confirmación de seguridad
    const confirmMessage = `⚠️ ADVERTENCIA: Esta acción restaurará ${restorePreview.totalRecords} registros de ${Object.keys(restorePreview.preview).length} tablas.\n\n¿Estás seguro de que quieres continuar?\n\nEsto puede sobrescribir datos existentes.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    // Segunda confirmación
    const secondConfirm = window.confirm(`🚨 ÚLTIMA CONFIRMACIÓN\n\nEsta acción es IRREVERSIBLE y puede sobrescribir TODOS los datos actuales.\n\n¿Continuar con la restauración?`);
    
    if (!secondConfirm) {
      return;
    }

    try {
      setIsRestoring(true);
      console.log('🔄 Iniciando restauración de backup...');

      // Leer archivo nuevamente
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const backupData = JSON.parse(e.target.result);
          
          // Opciones de restauración
          const options = {
            clearExisting: true // Limpiar datos existentes
          };

          const result = await supabaseService.restoreFromBackup(backupData, options);

          if (result.success) {
            const successMessage = `✅ Restauración completada exitosamente!\n\n📊 Registros procesados: ${result.processed}\n📋 Errores: ${result.errors.length}\n\nLos datos han sido restaurados desde el backup.`;
            alert(successMessage);
            
            // Recargar estadísticas
            const stats = await supabaseService.getBackupStats();
            if (stats.success) {
              setBackupStats(stats);
            }
            
            // Cerrar modal
            setShowRestoreModal(false);
            setRestoreFile(null);
            setRestorePreview(null);
            
          } else {
            alert(`❌ Error en restauración: ${result.error}`);
          }
        } catch (error) {
          console.error('❌ Error procesando restauración:', error);
          alert(`❌ Error inesperado: ${error.message}`);
        } finally {
          setIsRestoring(false);
        }
      };
      
      reader.readAsText(restoreFile);

    } catch (error) {
      console.error('❌ Error iniciando restauración:', error);
      alert(`❌ Error inesperado: ${error.message}`);
      setIsRestoring(false);
    }
  };
  
  // Cargar estadísticas de backup al montar el componente
  React.useEffect(() => {
    const loadBackupStats = async () => {
      try {
        const stats = await supabaseService.getBackupStats();
        if (stats.success) {
          setBackupStats(stats);
        }
      } catch (error) {
        console.warn('⚠️ No se pudieron cargar estadísticas de backup:', error);
      }
    };
    
    loadBackupStats();
  }, []);
  
  const navigation = [
    { id: 'portfolio', name: 'Portafolio de Proyectos', icon: '🏢' },
    { id: 'project-management', name: 'Gestión de Proyectos', icon: '📊' },
    { id: 'executive', name: 'Dashboard Ejecutivo', icon: '📈' }
  ];

  const getSectionDescription = (sectionId) => {
    switch(sectionId) {
      case 'portfolio': return 'Gestión estratégica de proyectos con Business Case, TIR y presupuestos';
      case 'project-management': return 'Control operativo con módulos de riesgos, cronograma y finanzas';
      case 'executive': return 'KPIs consolidados y métricas ejecutivas de todos los proyectos activos';
      default: return '';
    }
  };

  const currentProject = projects?.find(p => p.id === currentProjectId);

  return (
    <>
      {/* Botón flotante para expandir cuando está colapsado */}
      {isCollapsed && (
        <button
          onClick={onToggleCollapse}
          className="fixed top-4 left-4 z-50 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all duration-200 hover:shadow-xl"
          title="Expandir menú"
        >
          <span className="text-lg font-bold">☰</span>
        </button>
      )}
      
      <div className={`
        fixed top-0 left-0 h-full bg-white shadow-xl z-40 
        ${isCollapsed ? 'w-16' : 'w-80 lg:w-72'} 
        border-r border-gray-200
        transition-all duration-300
      `}>
        {/* Header */}
        <div className={`border-b border-gray-200 ${isCollapsed ? 'p-2' : 'p-6'}`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            {!isCollapsed && (
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                StrategiaPM
              </h1>
            )}
            <button
              onClick={onToggleCollapse}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200 z-10 relative"
              title={isCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
              style={{ minWidth: '40px', minHeight: '40px' }}
            >
              <span className="text-xl font-bold">
                {isCollapsed ? '→' : '←'}
              </span>
            </button>
          </div>
          
          {!isCollapsed && (
            <div className="text-sm text-gray-600">
              <p className="font-medium">Gestión de Proyectos</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        {!isCollapsed && (
          <nav className="p-4">
            <ul className="space-y-2">
              {navigation.map(section => (
                <li key={section.id}>
                  <button
                    onClick={() => onSectionChange(section.id)}
                    className={`
                      w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors
                      ${activeSection === section.id
                        ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-500'
                        : 'text-gray-700 hover:bg-gray-100'
                      }
                    `}
                  >
                    <span className="text-xl mr-3">{section.icon}</span>
                    <div>
                      <div className="font-medium">{section.name}</div>
                      <div className="text-xs text-gray-500">
                        {getSectionDescription(section.id)}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {/* Footer con botones de backup */}
        <div className={`border-t border-gray-200 mt-auto ${isCollapsed ? 'p-2' : 'p-4'}`}>
          {!isCollapsed ? (
            <div className="space-y-2">
              {/* Botón de Backup */}
              <button
                onClick={handleDatabaseBackup}
                disabled={isBackingUp}
                className={`w-full px-4 py-3 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg ${
                  isBackingUp 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
                title="Descargar backup completo de la base de datos (archivo JSON)"
              >
                <span className="text-lg">
                  {isBackingUp ? '⏳' : '🗄️'}
                </span>
                <span className="font-medium">
                  {isBackingUp ? 'Descargando...' : 'Descargar Backup'}
                </span>
              </button>

              {/* Botón de Restaurar */}
              <button
                onClick={() => setShowRestoreModal(true)}
                disabled={isRestoring}
                className={`w-full px-4 py-3 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg ${
                  isRestoring 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
                title="Restaurar datos desde un archivo de backup"
              >
                <span className="text-lg">
                  {isRestoring ? '⏳' : '🔄'}
                </span>
                <span className="font-medium">
                  {isRestoring ? 'Restaurando...' : 'Restaurar Backup'}
                </span>
              </button>
              
              {/* Estadísticas de backup */}
              {backupStats && (
                <div className="mt-2 text-xs text-gray-500 text-center">
                  <div>📊 {backupStats.totalRecords} registros en {backupStats.tablesCount} tablas</div>
                  {backupStats.stats && (
                    <div className="mt-1">
                      Proyectos: {backupStats.stats.projects || 0} | 
                      Riesgos: {backupStats.stats.risks || 0} | 
                      Tareas: {backupStats.stats.tasks || 0}
                    </div>
                  )}
                </div>
              )}

              {/* Indicador de backup automático */}
              <div className="mt-2 pt-2 border-t border-gray-100">
                <AutoBackupIndicator className="justify-center" />
              </div>
            </div>
          ) : (
            /* Botones colapsados */
            <div className="space-y-2">
              <button
                onClick={handleDatabaseBackup}
                disabled={isBackingUp}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white p-3 rounded-lg transition-colors duration-200 flex items-center justify-center"
                title="Descargar backup"
              >
                <span className="text-lg">🗄️</span>
              </button>
              
              <button
                onClick={() => setShowRestoreModal(true)}
                disabled={isRestoring}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white p-3 rounded-lg transition-colors duration-200 flex items-center justify-center"
                title="Restaurar backup"
              >
                <span className="text-lg">🔄</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal de Restauración */}
        {showRestoreModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-800">🔄 Restaurar Backup</h2>
                  <button 
                    onClick={() => {
                      setShowRestoreModal(false);
                      setRestoreFile(null);
                      setRestorePreview(null);
                    }}
                    className="text-gray-500 hover:text-gray-700 text-xl"
                  >
                    ✕
                  </button>
                </div>

                {/* Selección de archivo */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seleccionar archivo de backup (.json)
                  </label>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileSelect}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {restoreFile && (
                    <p className="mt-2 text-sm text-green-600">
                      ✅ Archivo seleccionado: {restoreFile.name}
                    </p>
                  )}
                </div>

                {/* Preview del backup */}
                {restorePreview && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">
                      📋 Vista Previa del Backup
                    </h3>
                    
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">📅 Fecha:</span>
                          <span className="ml-2">
                            {new Date(restorePreview.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">📊 Total registros:</span>
                          <span className="ml-2 font-bold text-blue-600">
                            {restorePreview.totalRecords}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">📋 Tablas:</span>
                          <span className="ml-2">
                            {Object.keys(restorePreview.preview).length}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">🔢 Versión:</span>
                          <span className="ml-2">
                            {restorePreview.version}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Detalles por tabla */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-700">Detalles por tabla:</h4>
                      {Object.entries(restorePreview.preview).map(([tableName, tableData]) => (
                        <div key={tableName} className="flex justify-between items-center bg-white border rounded-lg px-3 py-2">
                          <span className="font-medium capitalize">
                            {tableName.replace('_', ' ')}
                          </span>
                          <span className="text-blue-600 font-bold">
                            {tableData.count} registros
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Advertencia de seguridad */}
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <span className="text-red-500 text-xl mr-3">⚠️</span>
                    <div>
                      <h4 className="font-semibold text-red-800 mb-2">Advertencia Importante</h4>
                      <ul className="text-sm text-red-700 space-y-1">
                        <li>• Esta acción es <strong>IRREVERSIBLE</strong></li>
                        <li>• Se <strong>eliminarán TODOS los datos actuales</strong></li>
                        <li>• Se restaurarán los datos del archivo seleccionado</li>
                        <li>• Asegúrate de tener un backup actual antes de continuar</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowRestoreModal(false);
                      setRestoreFile(null);
                      setRestorePreview(null);
                    }}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleRestoreBackup}
                    disabled={!restoreFile || !restorePreview || isRestoring}
                    className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                      !restoreFile || !restorePreview || isRestoring
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    {isRestoring ? '⏳ Restaurando...' : '🚨 Restaurar Backup'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Sidebar;