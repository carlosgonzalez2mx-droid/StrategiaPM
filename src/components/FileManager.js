import React, { useState, useMemo, useRef, useEffect } from 'react';
import useFileStorage from '../hooks/useFileStorage';
import usePermissions from '../hooks/usePermissions';
import subscriptionService from '../services/SubscriptionService';

const FileManager = ({
  projectId,
  organizationId = null, // Para verificar límites del plan
  category = 'general',
  relatedItemId = null,
  onFileUploaded = null,
  showUploadArea = true,
  isContextual = false, // Para mostrar si es vista contextual
  title = '📎 Gestión de Archivos' // Título personalizable
}) => {
  // Hook de permisos
  const { permissions } = usePermissions();

  const {
    files,
    isLoading,
    error,
    uploadFile,
    deleteFile,
    getFilesByCategory,
    getFilesByRelatedItem,
    searchFiles,
    getFileStats,
    fileLimits
  } = useFileStorage(projectId);

  const [dragActive, setDragActive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(category);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadDescription, setUploadDescription] = useState('');
  const [isReadOnlyMode, setIsReadOnlyMode] = useState(false);

  // Verificar modo read-only
  useEffect(() => {
    const checkReadOnlyMode = async () => {
      if (organizationId) {
        try {
          const editPermission = await subscriptionService.canEdit(organizationId);
          setIsReadOnlyMode(!editPermission.allowed);
        } catch (error) {
          console.error('[READ-ONLY MODE] Error verificando permisos:', error);
          setIsReadOnlyMode(false);
        }
      }
    };
    checkReadOnlyMode();
  }, [organizationId]);

  // Determinar si se puede mostrar área de subida basado en permisos
  const canUploadFiles = showUploadArea && permissions.canEdit && !isReadOnlyMode;
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [viewMode] = useState('list'); // Solo vista de lista
  const fileInputRef = useRef(null);

  // Filtrar archivos según parámetros
  const filteredFiles = useMemo(() => {
    let filtered = files;

    console.log('🔍 FileManager - Filtrado:', {
      totalFiles: files.length,
      category,
      selectedCategory,
      isContextual,
      searchTerm
    });

    // DEBUG: Ver descripciones de archivos
    if (files.length > 0) {
      console.log('📄 Archivos con descripciones:', files.map(f => ({
        nombre: f.fileName,
        descripcion: f.description,
        metadata: f.metadata
      })));
    }

    // Si estamos en modo contextual (category específica), usar esa categoría
    if (category !== 'general' && isContextual) {
      filtered = getFilesByCategory(category);
      console.log('📂 Filtrado por categoría contextual:', category, 'archivos:', filtered.length);
    } else if (selectedCategory !== 'general') {
      // Si no estamos en modo contextual, usar la categoría seleccionada
      filtered = getFilesByCategory(selectedCategory);
      console.log('📂 Filtrado por categoría seleccionada:', selectedCategory, 'archivos:', filtered.length);
    }

    if (relatedItemId) {
      filtered = getFilesByRelatedItem(relatedItemId);
      console.log('🔗 Filtrado por item relacionado:', relatedItemId, 'archivos:', filtered.length);
    }

    if (searchTerm) {
      filtered = searchFiles(searchTerm);
      console.log('🔍 Filtrado por búsqueda:', searchTerm, 'archivos:', filtered.length);
    }

    console.log('✅ Archivos finales filtrados:', filtered.length);
    return filtered.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
  }, [files, category, selectedCategory, relatedItemId, searchTerm, isContextual, getFilesByCategory, getFilesByRelatedItem, searchFiles]);

  // Estadísticas de archivos
  const fileStats = useMemo(() => getFileStats(), [getFileStats]);

  // Manejar drag & drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // Manejar selección de archivos
  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  // Procesar archivos seleccionados
  const handleFiles = async (fileList) => {
    setSelectedFiles(Array.from(fileList));
    setShowUploadModal(true);
  };

  // Subir archivos
  const handleUpload = async () => {
    try {
      for (const file of selectedFiles) {
        await uploadFile(file, selectedCategory, relatedItemId, uploadDescription);
      }

      setShowUploadModal(false);
      setSelectedFiles([]);
      setUploadDescription('');

      if (onFileUploaded) {
        onFileUploaded();
      }

    } catch (error) {
      console.error('Error uploading files:', error);
    }
  };

  // Descargar archivo
  const downloadFile = (file) => {
    const link = document.createElement('a');
    link.href = file.content;
    link.download = file.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Vista previa de archivo
  const previewFile = (file) => {
    const mimeType = file.mimeType || file.type || '';
    if (mimeType.startsWith('image/')) {
      window.open(file.content, '_blank');
    } else if (mimeType === 'application/pdf') {
      window.open(file.content, '_blank');
    } else {
      downloadFile(file);
    }
  };

  // Obtener icono según tipo de archivo (para archivos procesados)
  const getFileIcon = (file) => {
    const mimeType = file.mimeType || file.type || '';
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('excel')) return '📊';
    return '📎';
  };

  // Obtener icono para archivos nativos del navegador
  const getNativeFileIcon = (file) => {
    const mimeType = file.type || '';
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('excel')) return '📊';
    return '📎';
  };

  // Obtener color según tipo de archivo
  const getFileColor = (file) => {
    const mimeType = file.mimeType || file.type || '';
    if (mimeType.startsWith('image/')) return 'from-pink-500 to-rose-500';
    if (mimeType === 'application/pdf') return 'from-red-500 to-pink-500';
    if (mimeType.includes('word')) return 'from-blue-500 to-indigo-500';
    if (mimeType.includes('excel')) return 'from-green-500 to-emerald-500';
    return 'from-gray-500 to-slate-500';
  };

  // Formatear tamaño de archivo
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Categorías disponibles
  const categories = [
    { id: 'purchase-order', name: 'Órdenes de Compra', icon: '🛒', color: 'bg-blue-100 text-blue-800' },
    { id: 'invoice', name: 'Facturas', icon: '🧾', color: 'bg-green-100 text-green-800' },
    { id: 'advance', name: 'Anticipos', icon: '💰', color: 'bg-yellow-100 text-yellow-800' },
    { id: 'contract', name: 'Contratos', icon: '📋', color: 'bg-purple-100 text-purple-800' },
    { id: 'edital', name: 'Edital', icon: '📢', color: 'bg-orange-100 text-orange-800' },
    { id: 'risk-evidence', name: 'Evidencia de Riesgos', icon: '🛡️', color: 'bg-red-100 text-red-800' },
    { id: 'general', name: 'General', icon: '📁', color: 'bg-gray-100 text-gray-800' }
  ];

  // Obtener categoría actual
  const currentCategory = categories.find(cat => cat.id === selectedCategory);

  return (
    <div className="space-y-6 pb-32">
      {/* Header con estadísticas - Diseño mejorado */}
      <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl text-white">
              <span className="text-2xl">📎</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">{title}</h3>
              <p className="text-sm text-gray-600">
                {isContextual ? 'Archivos relacionados con este contexto' : 'Gestión completa de documentos del proyecto'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Estadísticas */}
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-800">{fileStats.totalFiles}</div>
              <div className="text-sm text-gray-600">archivos</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-gray-800">{fileStats.totalSizeMB}MB</div>
              <div className="text-xs text-gray-500">total</div>
            </div>

            {/* Botón de upload */}
            {canUploadFiles && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <span className="mr-2">📤</span>
                Subir Archivos
              </button>
            )}
          </div>
        </div>

        {/* Filtros y búsqueda - Diseño mejorado */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Búsqueda */}
          <div className="lg:col-span-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-400">🔍</span>
              </div>
              <input
                type="text"
                placeholder="Buscar archivos por nombre, descripción o categoría..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm transition-all duration-200"
              />
            </div>
          </div>

          {/* Selector de categoría */}
          {category === 'general' && (
            <div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm transition-all duration-200"
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Vista de categoría actual */}
        {currentCategory && (
          <div className="mt-4 flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${currentCategory.color}`}>
              {currentCategory.icon} {currentCategory.name}
            </span>
            <span className="text-sm text-gray-500">
              {filteredFiles.length} archivo{filteredFiles.length !== 1 ? 's' : ''} encontrado{filteredFiles.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Indicador para usuarios de solo lectura */}
      {!permissions.canEdit && showUploadArea && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 text-center">
          <div className="flex items-center justify-center space-x-3 text-orange-700">
            <span className="text-2xl">👀</span>
            <div>
              <p className="font-medium text-lg">Modo Solo Lectura</p>
              <p className="text-sm text-orange-600">
                Puedes visualizar y descargar archivos, pero no subir nuevos
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Área de drag & drop eliminada - usar botón "Subir Archivos" arriba */}

      {/* Vista de lista única - controles de vista eliminados */}

      {/* Lista de archivos - Diseño mejorado */}
      {filteredFiles.length > 0 ? (
        <div className="space-y-4">
          {
            /* Vista Lista - Tabla moderna */
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Archivo</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tamaño</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredFiles.map((file) => (
                      <tr key={file.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg bg-gradient-to-r ${getFileColor(file)} text-white`}>
                              {getFileIcon(file)}
                            </div>
                            <div className="max-w-xs">
                              <div className="font-medium text-gray-900">{file.fileName}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600 max-w-md">
                            {file.description || <span className="text-gray-400 italic">Sin descripción</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {formatFileSize(file.fileSize)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(file.uploadDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => previewFile(file)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Vista previa"
                            >
                              👁️
                            </button>
                            <button
                              onClick={() => downloadFile(file)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Descargar"
                            >
                              ⬇️
                            </button>
                            <button
                              onClick={() => deleteFile(file.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          }
        </div>
      ) : (
        /* Estado vacío - Diseño mejorado */
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="text-6xl mb-6">📁</div>
          <div className="space-y-2">
            <div className="text-2xl font-bold text-gray-700">
              No hay archivos
            </div>
            <div className="text-gray-500 max-w-md mx-auto">
              {searchTerm ? 'No se encontraron archivos con esa búsqueda' : 'Sube tu primer archivo para comenzar'}
            </div>
          </div>
        </div>
      )}

      {/* Input de archivos oculto */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Modal de upload - Diseño mejorado */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800">
                  📤 Subir Archivos
                </h3>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedFiles([]);
                    setUploadDescription('');
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Categoría */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📂 Categoría
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📝 Descripción (opcional)
                  </label>
                  <textarea
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    placeholder="Describe brevemente estos archivos..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                    rows="3"
                  />
                </div>

                {/* Archivos seleccionados */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📎 Archivos seleccionados ({selectedFiles.length})
                  </label>
                  <div className="max-h-32 overflow-y-auto space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{getNativeFileIcon(file)}</span>
                          <span className="text-sm font-medium text-gray-700">{file.name}</span>
                        </div>
                        <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex justify-end space-x-3 mt-8">
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedFiles([]);
                    setUploadDescription('');
                  }}
                  className="px-6 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpload}
                  disabled={isLoading}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <span className="animate-spin mr-2">⏳</span>
                      Subiendo...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <span className="mr-2">📤</span>
                      Subir Archivos
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mensaje de error - Diseño mejorado */}
      {error && (
        <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center space-x-2">
            <span className="text-red-600 text-lg">❌</span>
            <span className="text-red-800 font-medium">{error}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileManager;
