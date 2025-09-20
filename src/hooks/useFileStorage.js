import { useState, useEffect, useCallback } from 'react';
import supabaseService from '../services/SupabaseService';

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
  const [storageProvider, setStorageProvider] = useState('local'); // 'local' o 'supabase'
  const [isSupabaseAvailable, setIsSupabaseAvailable] = useState(false);

  // Verificar disponibilidad de Supabase al inicializar
  useEffect(() => {
    const checkSupabaseAvailability = async () => {
      try {
        if (supabaseService.isAuthenticated()) {
          console.log('🔍 Verificando disponibilidad de Supabase Storage...');
          const isAvailable = await supabaseService.initializeStorage();
          setIsSupabaseAvailable(isAvailable);
          setStorageProvider(isAvailable ? 'supabase' : 'local');
          console.log(`✅ Storage provider configurado: ${isAvailable ? 'Supabase' : 'Local'}`);
        } else {
          console.log('⚠️ Usuario no autenticado, usando almacenamiento local');
          setIsSupabaseAvailable(false);
          setStorageProvider('local');
        }
      } catch (error) {
        console.error('❌ Error verificando Supabase:', error);
        setIsSupabaseAvailable(false);
        setStorageProvider('local');
      }
    };

    checkSupabaseAvailability();
  }, []);

  // Cargar archivos del proyecto
  useEffect(() => {
    if (!projectId) return;
    
    loadProjectFiles();
  }, [projectId, storageProvider, isSupabaseAvailable]);

  // Función para cargar archivos según el proveedor de almacenamiento
  const loadProjectFiles = useCallback(async () => {
    if (!projectId) return;

    setIsLoading(true);
    setError(null);

    try {
      if (isSupabaseAvailable && storageProvider === 'supabase') {
        // Cargar desde Supabase Storage
        console.log(`📂 Cargando archivos desde Supabase para proyecto ${projectId}...`);
        const { success, files: supabaseFiles, error } = await supabaseService.listProjectFiles(projectId);
        
        if (success) {
          // Convertir archivos de Supabase al formato esperado
          const convertedFiles = supabaseFiles.map(file => ({
            ...file,
            // Asegurar que tenga todos los campos necesarios
            mimeType: file.metadata?.mimeType || 'application/octet-stream',
            description: file.metadata?.description || '',
            relatedItemId: file.metadata?.relatedItemId || null,
            content: file.publicUrl, // URL para acceso directo
            fileExtension: file.fileName.split('.').pop()?.toLowerCase() || ''
          }));
          
          setFiles(convertedFiles);
          console.log(`✅ ${convertedFiles.length} archivos cargados desde Supabase`);
        } else {
          console.error('❌ Error cargando desde Supabase:', error);
          // Fallback a localStorage
          loadFromLocalStorage();
        }
      } else {
        // Cargar desde localStorage
        loadFromLocalStorage();
      }
    } catch (error) {
      console.error('❌ Error cargando archivos:', error);
      setError('Error al cargar archivos del proyecto');
      // Fallback a localStorage
      loadFromLocalStorage();
    } finally {
      setIsLoading(false);
    }
  }, [projectId, isSupabaseAvailable, storageProvider]);

  // Función auxiliar para cargar desde localStorage
  const loadFromLocalStorage = useCallback(() => {
    try {
      const savedFiles = localStorage.getItem(`project-files-${projectId}`);
      if (savedFiles) {
        const parsedFiles = JSON.parse(savedFiles);
        setFiles(parsedFiles);
        console.log(`✅ ${parsedFiles.length} archivos cargados desde localStorage`);
      }
    } catch (error) {
      console.error('❌ Error cargando desde localStorage:', error);
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

      let newFile;

      if (isSupabaseAvailable && storageProvider === 'supabase') {
        // Subir a Supabase Storage
        console.log('☁️ Subiendo archivo a Supabase Storage...');
        
        const metadata = {
          description,
          relatedItemId,
          originalName: file.name,
          uploadedBy: supabaseService.getCurrentUser()?.email || 'Usuario',
          mimeType: file.type
        };

        const uploadResult = await supabaseService.uploadFileToStorage(
          processedFile, 
          projectId, 
          category, 
          metadata
        );

        if (uploadResult.success) {
          newFile = {
            ...uploadResult.file,
            description,
            relatedItemId,
            fileExtension: file.name.split('.').pop().toLowerCase(),
            uploadedBy: supabaseService.getCurrentUser()?.email || 'Usuario Actual'
          };

          // Agregar a la lista local
          const updatedFiles = files.slice();
          updatedFiles.push(newFile);
          setFiles(updatedFiles);

          console.log('✅ Archivo subido exitosamente a Supabase Storage:', newFile.fileName);
        } else {
          throw new Error(`Error subiendo a Supabase: ${uploadResult.error?.message || 'Error desconocido'}`);
        }
      } else {
        // Subir a localStorage (fallback)
        console.log('💾 Subiendo archivo a localStorage...');
        
        // Convertir a base64
        const base64Content = await fileToBase64(processedFile);

        // Crear objeto de archivo
        newFile = {
          id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          projectId,
          category,
          relatedItemId,
          fileName: file.name,
          originalName: file.name,
          fileSize: processedFile.size,
          mimeType: file.type,
          uploadDate: new Date().toISOString(),
          uploadedBy: 'Usuario Actual',
          description,
          content: base64Content,
          fileExtension: file.name.split('.').pop().toLowerCase(),
          metadata: {
            storageProvider: 'local'
          }
        };

        // Agregar a la lista
        const updatedFiles = files.slice();
        updatedFiles.push(newFile);
        setFiles(updatedFiles);
        saveFiles(updatedFiles);

        console.log('✅ Archivo subido exitosamente a localStorage:', newFile.fileName);
      }

      return newFile;

    } catch (error) {
      console.error('Error uploading file:', error);
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [files, projectId, validateFile, compressImage, fileToBase64, saveFiles, isSupabaseAvailable, storageProvider]);

  // Eliminar archivo
  const deleteFile = useCallback(async (fileId) => {
    try {
      // Encontrar el archivo a eliminar
      const fileToDelete = files.find(f => f.id === fileId);
      if (!fileToDelete) {
        throw new Error('Archivo no encontrado');
      }

      // Si está en Supabase Storage, eliminarlo de allí también
      if (isSupabaseAvailable && storageProvider === 'supabase' && fileToDelete.storagePath) {
        console.log('🗑️ Eliminando archivo de Supabase Storage...');
        const deleteResult = await supabaseService.deleteFileFromStorage(fileToDelete.storagePath);
        
        if (!deleteResult.success) {
          console.warn('⚠️ Error eliminando archivo de Supabase Storage:', deleteResult.error);
          // Continuar con la eliminación local aunque falle en Supabase
        } else {
          console.log('✅ Archivo eliminado de Supabase Storage');
        }
      }

      // Eliminar de la lista local
      const updatedFiles = files.filter(f => f.id !== fileId);
      setFiles(updatedFiles);
      
      // Si es almacenamiento local, guardar en localStorage
      if (storageProvider === 'local') {
        saveFiles(updatedFiles);
      }

      console.log('✅ Archivo eliminado exitosamente:', fileId);
    } catch (error) {
      console.error('Error deleting file:', error);
      setError('Error al eliminar archivo');
    }
  }, [files, saveFiles, isSupabaseAvailable, storageProvider]);

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

  // Función para cambiar el proveedor de almacenamiento
  const switchStorageProvider = useCallback(async (provider) => {
    if (provider === 'supabase' && !isSupabaseAvailable) {
      console.warn('⚠️ Supabase no está disponible');
      return false;
    }

    setStorageProvider(provider);
    console.log(`🔄 Cambiando a proveedor de almacenamiento: ${provider}`);
    
    // Recargar archivos con el nuevo proveedor
    await loadProjectFiles();
    return true;
  }, [isSupabaseAvailable, loadProjectFiles]);

  // Función para sincronizar archivos locales con Supabase
  const syncWithSupabase = useCallback(async () => {
    if (!isSupabaseAvailable) {
      console.warn('⚠️ Supabase no está disponible para sincronización');
      return false;
    }

    try {
      console.log('🔄 Iniciando sincronización con Supabase...');
      
      // Obtener archivos locales
      const localFiles = files.filter(f => f.metadata?.storageProvider === 'local');
      
      if (localFiles.length === 0) {
        console.log('✅ No hay archivos locales para sincronizar');
        return true;
      }

      let syncedCount = 0;
      let errorCount = 0;

      for (const localFile of localFiles) {
        try {
          // Convertir base64 de vuelta a File para subir
          const response = await fetch(localFile.content);
          const blob = await response.blob();
          const file = new File([blob], localFile.fileName, { type: localFile.mimeType });

          // Subir a Supabase
          const uploadResult = await supabaseService.uploadFileToStorage(
            file,
            localFile.projectId,
            localFile.category,
            {
              description: localFile.description,
              relatedItemId: localFile.relatedItemId,
              originalName: localFile.fileName,
              uploadedBy: localFile.uploadedBy,
              mimeType: localFile.mimeType
            }
          );

          if (uploadResult.success) {
            // Actualizar archivo local con información de Supabase
            const updatedFile = {
              ...localFile,
              ...uploadResult.file,
              metadata: {
                ...localFile.metadata,
                storageProvider: 'supabase',
                syncedAt: new Date().toISOString()
              }
            };

            // Actualizar en la lista local
            const updatedFiles = files.map(f => 
              f.id === localFile.id ? updatedFile : f
            );
            setFiles(updatedFiles);
            
            syncedCount++;
            console.log(`✅ Sincronizado: ${localFile.fileName}`);
          } else {
            console.error(`❌ Error sincronizando ${localFile.fileName}:`, uploadResult.error);
            errorCount++;
          }
        } catch (error) {
          console.error(`❌ Error procesando ${localFile.fileName}:`, error);
          errorCount++;
        }
      }

      console.log(`🎉 Sincronización completada: ${syncedCount} exitosos, ${errorCount} errores`);
      return true;

    } catch (error) {
      console.error('❌ Error en sincronización:', error);
      return false;
    }
  }, [files, isSupabaseAvailable]);

  return {
    files,
    isLoading,
    error,
    storageProvider,
    isSupabaseAvailable,
    uploadFile,
    deleteFile,
    getFilesByCategory,
    getFilesByRelatedItem,
    searchFiles,
    getFileStats,
    clearProjectFiles,
    switchStorageProvider,
    syncWithSupabase,
    loadProjectFiles,
    fileLimits: FILE_LIMITS
  };
};

export default useFileStorage;
