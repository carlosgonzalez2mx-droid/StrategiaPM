import { useState, useEffect, useCallback } from 'react';

// Configuración de límites
const FILE_LIMITS = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFilesPerProject: 100,
  maxTotalSizePerProject: 500 * 1024 * 1024, // 500MB
  allowedTypes: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx'],
  allowedMimeTypes: [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
};

const useFileStorage = (projectId) => {
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Cargar archivos del proyecto desde localStorage
  useEffect(() => {
    if (!projectId) return;
    
    try {
      const savedFiles = localStorage.getItem(`project-files-${projectId}`);
      if (savedFiles) {
        setFiles(JSON.parse(savedFiles));
      }
    } catch (error) {
      console.error('Error loading project files:', error);
      setError('Error al cargar archivos del proyecto');
    }
  }, [projectId]);

  // Guardar archivos en localStorage
  const saveFiles = useCallback((fileList) => {
    if (!projectId) return;
    
    try {
      localStorage.setItem(`project-files-${projectId}`, JSON.stringify(fileList));
    } catch (error) {
      console.error('Error saving project files:', error);
      setError('Error al guardar archivos del proyecto');
    }
  }, [projectId]);

  // Validar archivo
  const validateFile = useCallback((file) => {
    // Validar tamaño
    if (file.size > FILE_LIMITS.maxFileSize) {
      throw new Error(`El archivo es demasiado grande. Máximo ${FILE_LIMITS.maxFileSize / (1024 * 1024)}MB`);
    }

    // Validar tipo
    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (!FILE_LIMITS.allowedTypes.includes(fileExtension)) {
      throw new Error(`Tipo de archivo no permitido. Tipos permitidos: ${FILE_LIMITS.allowedTypes.join(', ')}`);
    }

    // Validar MIME type
    if (!FILE_LIMITS.allowedMimeTypes.includes(file.type)) {
      throw new Error('Tipo de archivo no válido');
    }

    return true;
  }, []);

  // Comprimir imagen si es necesario
  const compressImage = useCallback(async (file) => {
    if (!file.type.startsWith('image/')) return file;

    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calcular nuevas dimensiones (máximo 1200px)
        const maxSize = 1200;
        let { width, height } = img;
        
        if (width > height && width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        } else if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }

        canvas.width = width;
        canvas.height = height;
        
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          const compressedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now()
          });
          resolve(compressedFile);
        }, file.type, 0.8); // Calidad 80%
      };

      img.src = URL.createObjectURL(file);
    });
  }, []);

  // Convertir archivo a base64
  const fileToBase64 = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  }, []);

  // Subir archivo
  const uploadFile = useCallback(async (file, category, relatedItemId, description = '') => {
    setIsLoading(true);
    setError(null);

    try {
      // Validar archivo
      validateFile(file);

      // Verificar límites del proyecto
      if (files.length >= FILE_LIMITS.maxFilesPerProject) {
        throw new Error(`Límite de archivos alcanzado. Máximo ${FILE_LIMITS.maxFilesPerProject} archivos por proyecto`);
      }

      const totalSize = files.reduce((sum, f) => sum + f.fileSize, 0) + file.size;
      if (totalSize > FILE_LIMITS.maxTotalSizePerProject) {
        throw new Error(`Límite de tamaño alcanzado. Máximo ${FILE_LIMITS.maxTotalSizePerProject / (1024 * 1024)}MB por proyecto`);
      }

      // Comprimir imagen si es necesario
      const processedFile = await compressImage(file);

      // Convertir a base64
      const base64Content = await fileToBase64(processedFile);

      // Crear objeto de archivo
      const newFile = {
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        projectId,
        category,
        relatedItemId,
        fileName: file.name,
        originalName: file.name,
        fileSize: processedFile.size,
        mimeType: file.type,
        uploadDate: new Date().toISOString(),
        uploadedBy: 'Usuario Actual', // TODO: Integrar con sistema de usuarios
        description,
        content: base64Content,
        fileExtension: file.name.split('.').pop().toLowerCase()
      };

      // Agregar a la lista
      const updatedFiles = files.slice();
      updatedFiles.push(newFile);
      setFiles(updatedFiles);
      saveFiles(updatedFiles);

      console.log('✅ Archivo subido exitosamente:', newFile.fileName);
      return newFile;

    } catch (error) {
      console.error('Error uploading file:', error);
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [files, projectId, validateFile, compressImage, fileToBase64, saveFiles]);

  // Eliminar archivo
  const deleteFile = useCallback((fileId) => {
    try {
      const updatedFiles = files.filter(f => f.id !== fileId);
      setFiles(updatedFiles);
      saveFiles(updatedFiles);
      console.log('✅ Archivo eliminado exitosamente:', fileId);
    } catch (error) {
      console.error('Error deleting file:', error);
      setError('Error al eliminar archivo');
    }
  }, [files, saveFiles]);

  // Obtener archivos por categoría
  const getFilesByCategory = useCallback((category) => {
    if (category === 'financial-only') {
      // Para categoría financiera, incluir solo archivos relacionados con finanzas
      return files.filter(f => 
        ['purchase-order', 'invoice', 'advance', 'contract'].includes(f.category)
      );
    }
    if (category === 'risk-evidence') {
      // Para categoría de riesgos, incluir solo archivos relacionados con riesgos
      return files.filter(f => 
        ['risk-evidence'].includes(f.category)
      );
    }
    return files.filter(f => f.category === category);
  }, [files]);

  // Obtener archivos por item relacionado
  const getFilesByRelatedItem = useCallback((relatedItemId) => {
    return files.filter(f => f.relatedItemId === relatedItemId);
  }, [files]);

  // Buscar archivos
  const searchFiles = useCallback((searchTerm) => {
    const term = searchTerm.toLowerCase();
    return files.filter(f => 
      f.fileName.toLowerCase().includes(term) ||
      f.description.toLowerCase().includes(term) ||
      f.category.toLowerCase().includes(term)
    );
  }, [files]);

  // Obtener estadísticas de archivos
  const getFileStats = useCallback(() => {
    const totalSize = files.reduce((sum, f) => sum + f.fileSize, 0);
    const categories = Array.from(new Set(files.map(f => f.category)));
    
    return {
      totalFiles: files.length,
      totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      categories,
      filesByCategory: categories.reduce((acc, cat) => {
        acc[cat] = files.filter(f => f.category === cat).length;
        return acc;
      }, {})
    };
  }, [files]);

  // Limpiar archivos del proyecto
  const clearProjectFiles = useCallback(() => {
    if (!projectId) return;
    
    try {
      localStorage.removeItem(`project-files-${projectId}`);
      setFiles([]);
      console.log('✅ Archivos del proyecto limpiados');
    } catch (error) {
      console.error('Error clearing project files:', error);
      setError('Error al limpiar archivos del proyecto');
    }
  }, [projectId]);

  return {
    files,
    isLoading,
    error,
    uploadFile,
    deleteFile,
    getFilesByCategory,
    getFilesByRelatedItem,
    searchFiles,
    getFileStats,
    clearProjectFiles,
    fileLimits: FILE_LIMITS
  };
};

export default useFileStorage;
