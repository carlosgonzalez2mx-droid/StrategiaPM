import { useState, useEffect, useCallback } from 'react';
import supabaseService from '../services/SupabaseService';
import useStorageProvider from './useStorageProvider';
import useFileValidation, { FILE_LIMITS } from './useFileValidation';

/**
 * Hook principal para gestión de archivos del proyecto
 *
 * Refactorizado para usar hooks especializados:
 * - useStorageProvider: Gestión del proveedor de almacenamiento
 * - useFileValidation: Validación y procesamiento de archivos
 *
 * @param {string} projectId - ID del proyecto
 * @returns {Object} Estado y funciones para gestión de archivos
 */
const useFileStorage = (projectId) => {
  // Estado local
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Hooks especializados
  const {
    storageProvider,
    isSupabaseAvailable,
    switchStorageProvider: switchProvider,
    shouldUseSupabase,
  } = useStorageProvider();

  const {
    validateAndProcessFile,
    fileToBase64,
    FILE_LIMITS: fileLimits,
  } = useFileValidation();

  // Cargar archivos del proyecto al montar o cambiar proyecto/proveedor
  useEffect(() => {
    if (!projectId) return;
    loadProjectFiles();
  }, [projectId, storageProvider, isSupabaseAvailable]);

  /**
   * Carga archivos desde localStorage
   */
  const loadFromLocalStorage = useCallback(() => {
    try {
      const key = `project-files-${projectId}`;
      const savedFiles = localStorage.getItem(key);

      if (savedFiles) {
        const parsedFiles = JSON.parse(savedFiles);
        setFiles(Array.isArray(parsedFiles) ? parsedFiles : []);
        console.log(`📂 ${parsedFiles.length} archivos cargados desde localStorage`);
      } else {
        setFiles([]);
      }
    } catch (error) {
      console.error('❌ Error cargando desde localStorage:', error);
      setFiles([]);
    }
  }, [projectId]);

  /**
   * Guarda archivos en localStorage
   */
  const saveFiles = useCallback((fileList) => {
    try {
      const key = `project-files-${projectId}`;
      localStorage.setItem(key, JSON.stringify(fileList));
      console.log(`💾 ${fileList.length} archivos guardados en localStorage`);
    } catch (error) {
      console.error('❌ Error guardando en localStorage:', error);
    }
  }, [projectId]);

  /**
   * Carga archivos del proyecto según el proveedor de almacenamiento
   */
  const loadProjectFiles = useCallback(async () => {
    if (!projectId) return;

    setIsLoading(true);
    setError(null);

    try {
      if (shouldUseSupabase()) {
        // Cargar desde Supabase Storage
        console.log(`📂 Cargando archivos desde Supabase para proyecto ${projectId}...`);
        const { success, files: supabaseFiles, error: supabaseError } =
          await supabaseService.listProjectFiles(projectId);

        if (success) {
          // Convertir archivos de Supabase al formato esperado
          const convertedFiles = supabaseFiles.map(file => ({
            ...file,
            mimeType: file.metadata?.mimeType || 'application/octet-stream',
            description: file.metadata?.description || '',
            relatedItemId: file.metadata?.relatedItemId || null,
            content: file.publicUrl,
            fileExtension: file.fileName.split('.').pop()?.toLowerCase() || ''
          }));

          setFiles(convertedFiles);
          console.log(`✅ ${convertedFiles.length} archivos cargados desde Supabase`);
        } else {
          console.error('❌ Error cargando desde Supabase:', supabaseError);
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
      // Fallback a localStorage en caso de error
      loadFromLocalStorage();
    } finally {
      setIsLoading(false);
    }
  }, [projectId, shouldUseSupabase, loadFromLocalStorage]);

  /**
   * Sube un archivo al proyecto
   */
  const uploadFile = useCallback(async (file, category, relatedItemId, description = '') => {
    setIsLoading(true);
    setError(null);

    try {
      // Validar y procesar archivo (validación + compresión)
      const processedFile = await validateAndProcessFile(file, files);

      let newFile;

      if (shouldUseSupabase()) {
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

          const updatedFiles = [...files, newFile];
          setFiles(updatedFiles);

          console.log('✅ Archivo subido exitosamente a Supabase Storage:', newFile.fileName);
        } else {
          throw new Error(`Error subiendo a Supabase: ${uploadResult.error?.message || 'Error desconocido'}`);
        }
      } else {
        // Subir a localStorage
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

        const updatedFiles = [...files, newFile];
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
  }, [files, projectId, validateAndProcessFile, fileToBase64, saveFiles, shouldUseSupabase]);

  /**
   * Elimina un archivo del proyecto
   */
  const deleteFile = useCallback(async (fileId) => {
    try {
      const fileToDelete = files.find(f => f.id === fileId);
      if (!fileToDelete) {
        throw new Error('Archivo no encontrado');
      }

      // Eliminar de Supabase si corresponde
      if (shouldUseSupabase() && fileToDelete.storagePath) {
        console.log('🗑️ Eliminando archivo de Supabase Storage...');
        const deleteResult = await supabaseService.deleteFileFromStorage(fileToDelete.storagePath);

        if (!deleteResult.success) {
          console.warn('⚠️ Error eliminando archivo de Supabase Storage:', deleteResult.error);
        } else {
          console.log('✅ Archivo eliminado de Supabase Storage');
        }
      }

      // Eliminar de la lista local
      const updatedFiles = files.filter(f => f.id !== fileId);
      setFiles(updatedFiles);

      // Guardar en localStorage si corresponde
      if (storageProvider === 'local') {
        saveFiles(updatedFiles);
      }

      console.log('✅ Archivo eliminado exitosamente:', fileId);
    } catch (error) {
      console.error('Error deleting file:', error);
      setError('Error al eliminar archivo');
    }
  }, [files, saveFiles, shouldUseSupabase, storageProvider]);

  /**
   * Obtiene archivos por categoría
   */
  const getFilesByCategory = useCallback((category) => {
    if (category === 'financial-only') {
      return files.filter(f =>
        f.category === 'contract' ||
        f.category === 'invoice' ||
        f.category === 'financial'
      );
    }
    return files.filter(f => f.category === category);
  }, [files]);

  /**
   * Obtiene archivos por item relacionado
   */
  const getFilesByRelatedItem = useCallback((relatedItemId) => {
    return files.filter(f => f.relatedItemId === relatedItemId);
  }, [files]);

  /**
   * Busca archivos por término de búsqueda
   */
  const searchFiles = useCallback((searchTerm) => {
    if (!searchTerm) return files;

    const term = searchTerm.toLowerCase();
    return files.filter(f =>
      f.fileName.toLowerCase().includes(term) ||
      f.description?.toLowerCase().includes(term) ||
      f.category?.toLowerCase().includes(term)
    );
  }, [files]);

  /**
   * Obtiene estadísticas de archivos del proyecto
   */
  const getFileStats = useCallback(() => {
    const totalSize = files.reduce((sum, f) => sum + (f.fileSize || 0), 0);
    const filesByCategory = files.reduce((acc, f) => {
      acc[f.category] = (acc[f.category] || 0) + 1;
      return acc;
    }, {});

    return {
      totalFiles: files.length,
      totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      filesByCategory,
      percentageUsed: ((totalSize / FILE_LIMITS.maxTotalSizePerProject) * 100).toFixed(1)
    };
  }, [files]);

  /**
   * Limpia todos los archivos del proyecto
   */
  const clearProjectFiles = useCallback(() => {
    setFiles([]);
    const key = `project-files-${projectId}`;
    localStorage.removeItem(key);
    console.log('🗑️ Archivos del proyecto limpiados');
  }, [projectId]);

  /**
   * Cambia el proveedor de almacenamiento
   */
  const switchStorageProvider = useCallback(async (provider) => {
    const success = await switchProvider(provider);
    if (success) {
      // Recargar archivos del nuevo proveedor
      await loadProjectFiles();
    }
    return success;
  }, [switchProvider, loadProjectFiles]);

  /**
   * Sincroniza archivos locales con Supabase
   */
  const syncWithSupabase = useCallback(async () => {
    if (!isSupabaseAvailable) {
      console.warn('⚠️ Supabase no está disponible');
      return false;
    }

    try {
      console.log('🔄 Iniciando sincronización con Supabase...');

      // Cargar archivos locales
      const key = `project-files-${projectId}`;
      const savedFiles = localStorage.getItem(key);
      const localFiles = savedFiles ? JSON.parse(savedFiles) : [];

      if (localFiles.length === 0) {
        console.log('📂 No hay archivos locales para sincronizar');
        return true;
      }

      console.log(`📤 Sincronizando ${localFiles.length} archivos con Supabase...`);

      // Subir cada archivo local a Supabase
      for (const file of localFiles) {
        // Solo sincronizar archivos que no estén ya en Supabase
        if (!file.storagePath && file.content) {
          try {
            // Reconstruir File object desde base64
            const base64Data = file.content.split(',')[1];
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: file.mimeType });
            const fileObject = new File([blob], file.fileName, { type: file.mimeType });

            // Subir a Supabase
            await uploadFile(fileObject, file.category, file.relatedItemId, file.description);
          } catch (error) {
            console.error(`❌ Error sincronizando archivo ${file.fileName}:`, error);
          }
        }
      }

      console.log('✅ Sincronización completada');
      return true;

    } catch (error) {
      console.error('❌ Error en sincronización:', error);
      return false;
    }
  }, [projectId, isSupabaseAvailable, uploadFile]);

  // API pública del hook
  return {
    // Estado
    files,
    isLoading,
    error,
    storageProvider,
    isSupabaseAvailable,

    // Funciones de gestión de archivos
    uploadFile,
    deleteFile,
    loadProjectFiles,

    // Funciones de búsqueda y filtrado
    getFilesByCategory,
    getFilesByRelatedItem,
    searchFiles,

    // Funciones de utilidad
    getFileStats,
    clearProjectFiles,

    // Funciones de proveedor
    switchStorageProvider,
    syncWithSupabase,

    // Constantes
    fileLimits,
  };
};

export default useFileStorage;
