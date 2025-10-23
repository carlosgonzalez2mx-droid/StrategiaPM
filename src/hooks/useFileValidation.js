import { useCallback } from 'react';

/**
 * Configuración de límites para archivos
 */
export const FILE_LIMITS = {
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

/**
 * Hook para validación, compresión y conversión de archivos
 *
 * Responsabilidades:
 * - Validar archivos (tamaño, tipo, MIME)
 * - Comprimir imágenes automáticamente
 * - Convertir archivos a base64
 * - Validar límites del proyecto
 *
 * @returns {Object} Funciones de validación y procesamiento
 */
const useFileValidation = () => {
  /**
   * Valida un archivo contra las restricciones configuradas
   * @param {File} file - Archivo a validar
   * @throws {Error} Si el archivo no cumple con los requisitos
   * @returns {boolean} true si la validación es exitosa
   */
  const validateFile = useCallback((file) => {
    // Validar tamaño
    if (file.size > FILE_LIMITS.maxFileSize) {
      throw new Error(`El archivo es demasiado grande. Máximo ${FILE_LIMITS.maxFileSize / (1024 * 1024)}MB`);
    }

    // Validar tipo de archivo por extensión
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

  /**
   * Valida límites del proyecto (cantidad de archivos y tamaño total)
   * @param {Array} existingFiles - Archivos existentes en el proyecto
   * @param {File} newFile - Nuevo archivo a agregar
   * @throws {Error} Si se exceden los límites
   */
  const validateProjectLimits = useCallback((existingFiles, newFile) => {
    // Verificar cantidad de archivos
    if (existingFiles.length >= FILE_LIMITS.maxFilesPerProject) {
      throw new Error(`Límite de archivos alcanzado. Máximo ${FILE_LIMITS.maxFilesPerProject} archivos por proyecto`);
    }

    // Verificar tamaño total
    const totalSize = existingFiles.reduce((sum, f) => sum + (f.fileSize || 0), 0) + newFile.size;
    if (totalSize > FILE_LIMITS.maxTotalSizePerProject) {
      throw new Error(`Límite de tamaño alcanzado. Máximo ${FILE_LIMITS.maxTotalSizePerProject / (1024 * 1024)}MB por proyecto`);
    }
  }, []);

  /**
   * Comprime una imagen si es necesario
   * @param {File} file - Archivo de imagen
   * @returns {Promise<File>} Archivo comprimido o el original si no es imagen
   */
  const compressImage = useCallback(async (file) => {
    // Si no es imagen, retornar el archivo original
    if (!file.type.startsWith('image/')) {
      return file;
    }

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
          console.log(`🖼️ Imagen comprimida: ${(file.size / 1024).toFixed(2)}KB → ${(compressedFile.size / 1024).toFixed(2)}KB`);
          resolve(compressedFile);
        }, file.type, 0.8); // Calidad 80%
      };

      img.onerror = () => {
        console.warn('⚠️ Error comprimiendo imagen, usando archivo original');
        resolve(file);
      };

      img.src = URL.createObjectURL(file);
    });
  }, []);

  /**
   * Convierte un archivo a base64
   * @param {File} file - Archivo a convertir
   * @returns {Promise<string>} Representación base64 del archivo
   */
  const fileToBase64 = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  }, []);

  /**
   * Valida y procesa un archivo completamente
   * @param {File} file - Archivo a procesar
   * @param {Array} existingFiles - Archivos existentes (para validar límites)
   * @returns {Promise<File>} Archivo procesado y validado
   */
  const validateAndProcessFile = useCallback(async (file, existingFiles = []) => {
    // Validar archivo
    validateFile(file);

    // Validar límites del proyecto
    validateProjectLimits(existingFiles, file);

    // Comprimir imagen si es necesario
    const processedFile = await compressImage(file);

    return processedFile;
  }, [validateFile, validateProjectLimits, compressImage]);

  return {
    // Funciones de validación
    validateFile,
    validateProjectLimits,

    // Funciones de procesamiento
    compressImage,
    fileToBase64,
    validateAndProcessFile,

    // Constantes exportadas
    FILE_LIMITS,
  };
};

export default useFileValidation;
