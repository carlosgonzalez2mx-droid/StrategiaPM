import React, { useState, useMemo, useRef } from 'react';
import useFileStorage from '../hooks/useFileStorage';

const FileManager = ({ 
  projectId, 
  category = 'general', 
  relatedItemId = null,
  onFileUploaded = null,
  showUploadArea = true,
  isContextual = false, // Para mostrar si es vista contextual
  title = '📎 Gestión de Archivos' // Título personalizable
}) => {
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
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' o 'list'
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
    { id: 'risk-evidence', name: 'Evidencia de Riesgos', icon: '🛡️', color: 'bg-red-100 text-red-800' },
    { id: 'general', name: 'General', icon: '📁', color: 'bg-gray-100 text-gray-800' }
  ];

  // Obtener categoría actual
  const currentCategory = categories.find(cat => cat.id === selectedCategory);

  return (
    <div className="space-y-6">
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
            {showUploadArea && (
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

      {/* Área de upload (drag & drop) - Diseño mejorado */}
      {showUploadArea && (
        <div
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
            dragActive 
              ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 scale-105' 
              : 'border-gray-300 hover:border-blue-400 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="space-y-6">
            <div className="text-6xl">📁</div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-gray-700">
                Arrastra archivos aquí
              </div>
              <div className="text-lg text-gray-600">
                o haz clic para seleccionar
              </div>
            </div>
            <div className="text-sm text-gray-500 max-w-md mx-auto">
              Tipos permitidos: PDF, JPG, PNG, DOC, DOCX, XLS, XLSX
              <br />
              Tamaño máximo: {fileLimits.maxFileSize / (1024 * 1024)}MB por archivo
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-8 py-4 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-xl hover:from-gray-200 hover:to-gray-300 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
            >
              Seleccionar Archivos
            </button>
          </div>
        </div>
      )}

      {/* Controles de vista */}
      {filteredFiles.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Vista:</span>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              ⬛⬛
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list' 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              ☰
            </button>
          </div>
        </div>
      )}

      {/* Lista de archivos - Diseño mejorado */}
      {filteredFiles.length > 0 ? (
        <div className="space-y-4">
          {viewMode === 'grid' ? (
            /* Vista Grid - Cards modernas */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredFiles.map((file) => (
                <div key={file.id} className="group bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
                  {/* Header del card */}
                  <div className={`p-4 bg-gradient-to-r ${getFileColor(file)} rounded-t-xl text-white`}>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{getFileIcon(file)}</span>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          onClick={() => deleteFile(file.id)}
                          className="p-1 bg-white bg-opacity-20 rounded hover:bg-opacity-30 transition-colors"
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Contenido del card */}
                  <div className="p-4">
                    <div className="space-y-3">
                      <div>
                        <div className="font-semibold text-gray-900 truncate" title={file.fileName}>
                          {file.fileName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatFileSize(file.fileSize)}
                        </div>
                      </div>
                      
                      {file.description && (
                        <div className="text-sm text-gray-600 line-clamp-2">
                          {file.description}
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-400">
                        {new Date(file.uploadDate).toLocaleDateString()}
                      </div>
                    </div>
                    
                    {/* Acciones del card */}
                    <div className="mt-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200">
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
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Vista Lista - Tabla moderna */
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Archivo</th>
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
                            <div>
                              <div className="font-medium text-gray-900">{file.fileName}</div>
                              {file.description && (
                                <div className="text-sm text-gray-500">{file.description}</div>
                              )}
                            </div>
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
          )}
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
