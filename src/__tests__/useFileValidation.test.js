/**
 * Tests para useFileValidation hook
 * Hook de validación y procesamiento de archivos
 */

import { renderHook } from '@testing-library/react';
import useFileValidation, { FILE_LIMITS } from '../hooks/useFileValidation';

describe('useFileValidation', () => {
  describe('FILE_LIMITS constante', () => {
    test('debe tener límites definidos correctamente', () => {
      expect(FILE_LIMITS.maxFileSize).toBe(10 * 1024 * 1024); // 10MB
      expect(FILE_LIMITS.maxFilesPerProject).toBe(100);
      expect(FILE_LIMITS.maxTotalSizePerProject).toBe(500 * 1024 * 1024); // 500MB
      expect(FILE_LIMITS.allowedTypes).toContain('pdf');
      expect(FILE_LIMITS.allowedTypes).toContain('jpg');
      expect(FILE_LIMITS.allowedTypes).toContain('png');
      expect(FILE_LIMITS.allowedMimeTypes).toContain('application/pdf');
      expect(FILE_LIMITS.allowedMimeTypes).toContain('image/jpeg');
    });
  });

  describe('validateFile', () => {
    test('debe validar archivo PDF correctamente', () => {
      const { result } = renderHook(() => useFileValidation());

      const mockFile = new File(['contenido'], 'documento.pdf', {
        type: 'application/pdf'
      });

      expect(() => result.current.validateFile(mockFile)).not.toThrow();
    });

    test('debe validar imagen JPEG correctamente', () => {
      const { result } = renderHook(() => useFileValidation());

      const mockFile = new File(['contenido'], 'imagen.jpg', {
        type: 'image/jpeg'
      });

      expect(() => result.current.validateFile(mockFile)).not.toThrow();
    });

    test('debe validar imagen PNG correctamente', () => {
      const { result } = renderHook(() => useFileValidation());

      const mockFile = new File(['contenido'], 'imagen.png', {
        type: 'image/png'
      });

      expect(() => result.current.validateFile(mockFile)).not.toThrow();
    });

    test('debe rechazar archivo demasiado grande', () => {
      const { result } = renderHook(() => useFileValidation());

      // Archivo de 15MB (excede 10MB)
      const largeContent = new Blob([new ArrayBuffer(15 * 1024 * 1024)]);
      const mockFile = new File([largeContent], 'archivo_grande.pdf', {
        type: 'application/pdf'
      });

      expect(() => result.current.validateFile(mockFile)).toThrow(/demasiado grande/);
    });

    test('debe rechazar tipo de archivo no permitido', () => {
      const { result } = renderHook(() => useFileValidation());

      const mockFile = new File(['contenido'], 'archivo.exe', {
        type: 'application/x-msdownload'
      });

      expect(() => result.current.validateFile(mockFile)).toThrow(/no permitido/);
    });

    test('debe rechazar MIME type no válido', () => {
      const { result } = renderHook(() => useFileValidation());

      // Archivo con extensión correcta pero MIME type incorrecto
      const mockFile = new File(['contenido'], 'archivo.pdf', {
        type: 'text/plain'
      });

      expect(() => result.current.validateFile(mockFile)).toThrow(/no válido/);
    });

    test('debe validar archivo Excel XLSX', () => {
      const { result } = renderHook(() => useFileValidation());

      const mockFile = new File(['contenido'], 'hoja.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      expect(() => result.current.validateFile(mockFile)).not.toThrow();
    });

    test('debe validar archivo Word DOCX', () => {
      const { result } = renderHook(() => useFileValidation());

      const mockFile = new File(['contenido'], 'documento.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      expect(() => result.current.validateFile(mockFile)).not.toThrow();
    });
  });

  describe('validateProjectLimits', () => {
    test('debe permitir agregar archivo cuando hay espacio', () => {
      const { result } = renderHook(() => useFileValidation());

      const existingFiles = [
        { fileSize: 1024 * 1024 }, // 1MB
        { fileSize: 2 * 1024 * 1024 } // 2MB
      ];

      const newFile = new File(['contenido'], 'nuevo.pdf', {
        type: 'application/pdf'
      });
      Object.defineProperty(newFile, 'size', { value: 1024 * 1024 }); // 1MB

      expect(() => result.current.validateProjectLimits(existingFiles, newFile)).not.toThrow();
    });

    test('debe rechazar cuando se excede límite de cantidad de archivos', () => {
      const { result } = renderHook(() => useFileValidation());

      // Crear 100 archivos (el límite)
      const existingFiles = Array(100).fill(null).map(() => ({ fileSize: 1024 }));

      const newFile = new File(['contenido'], 'nuevo.pdf', {
        type: 'application/pdf'
      });

      expect(() => result.current.validateProjectLimits(existingFiles, newFile))
        .toThrow(/Límite de archivos alcanzado/);
    });

    test('debe rechazar cuando se excede límite de tamaño total', () => {
      const { result } = renderHook(() => useFileValidation());

      // Archivos existentes que suman 490MB
      const existingFiles = [
        { fileSize: 490 * 1024 * 1024 }
      ];

      // Nuevo archivo de 20MB (total sería 510MB, excede 500MB)
      const largeContent = new Blob([new ArrayBuffer(20 * 1024 * 1024)]);
      const newFile = new File([largeContent], 'nuevo.pdf', {
        type: 'application/pdf'
      });

      expect(() => result.current.validateProjectLimits(existingFiles, newFile))
        .toThrow(/Límite de tamaño alcanzado/);
    });

    test('debe manejar archivos sin propiedad fileSize', () => {
      const { result } = renderHook(() => useFileValidation());

      const existingFiles = [
        {}, // Sin fileSize
        { fileSize: 1024 }
      ];

      const newFile = new File(['contenido'], 'nuevo.pdf', {
        type: 'application/pdf'
      });

      expect(() => result.current.validateProjectLimits(existingFiles, newFile)).not.toThrow();
    });
  });

  describe('fileToBase64', () => {
    test('debe convertir archivo a base64', async () => {
      const { result } = renderHook(() => useFileValidation());

      const mockFile = new File(['test content'], 'test.txt', {
        type: 'text/plain'
      });

      const base64 = await result.current.fileToBase64(mockFile);

      expect(base64).toBeDefined();
      expect(typeof base64).toBe('string');
      expect(base64.length).toBeGreaterThan(0);
    });

    test('debe retornar string base64 válido con data URL', async () => {
      const { result } = renderHook(() => useFileValidation());

      const mockFile = new File(['hello'], 'hello.txt', {
        type: 'text/plain'
      });

      const base64 = await result.current.fileToBase64(mockFile);

      // Debe tener formato data URL
      expect(base64).toMatch(/^data:/);
      expect(base64).toContain('base64,');
    });
  });

  describe('Funciones retornadas', () => {
    test('debe retornar todas las funciones necesarias', () => {
      const { result } = renderHook(() => useFileValidation());

      expect(typeof result.current.validateFile).toBe('function');
      expect(typeof result.current.validateProjectLimits).toBe('function');
      expect(typeof result.current.compressImage).toBe('function');
      expect(typeof result.current.fileToBase64).toBe('function');
      expect(typeof result.current.validateAndProcessFile).toBe('function');
      expect(result.current.FILE_LIMITS).toBeDefined();
    });
  });
});
