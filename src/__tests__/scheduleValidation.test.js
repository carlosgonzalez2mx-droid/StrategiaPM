/**
 * @jest-environment jsdom
 */
import {
  sanitizeInput,
  validateTaskName,
  validateDuration,
  validateDate,
  sortTasksByWbsCode
} from '../utils/scheduleValidation';

describe('scheduleValidation', () => {
  describe('sanitizeInput', () => {
    test('debe remover scripts maliciosos', () => {
      const input = '<script>alert("XSS")</script>Hola';
      const result = sanitizeInput(input);
      expect(result).not.toContain('<script>');
      expect(result).toBe('Hola');
    });

    test('debe remover javascript: URLs', () => {
      const input = 'javascript:alert("XSS")';
      const result = sanitizeInput(input);
      expect(result).not.toContain('javascript:');
    });

    test('debe limitar longitud a 1000 caracteres', () => {
      const input = 'a'.repeat(2000);
      const result = sanitizeInput(input);
      expect(result.length).toBe(1000);
    });

    test('debe retornar valores no-string sin cambios', () => {
      expect(sanitizeInput(123)).toBe(123);
      expect(sanitizeInput(null)).toBe(null);
      expect(sanitizeInput(undefined)).toBe(undefined);
    });
  });

  describe('validateTaskName', () => {
    test('debe validar nombres correctos', () => {
      const result = validateTaskName('Tarea de prueba');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('Tarea de prueba');
    });

    test('debe rechazar nombres muy cortos', () => {
      const result = validateTaskName('A');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('al menos 2 caracteres');
    });

    test('debe rechazar nombres muy largos', () => {
      const longName = 'a'.repeat(300);
      const result = validateTaskName(longName);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('muy largo');
    });

    test('debe rechazar nombres vacíos o nulos', () => {
      expect(validateTaskName('').valid).toBe(false);
      expect(validateTaskName(null).valid).toBe(false);
      expect(validateTaskName(undefined).valid).toBe(false);
    });
  });

  describe('validateDuration', () => {
    test('debe validar duraciones correctas', () => {
      const result = validateDuration(10);
      expect(result.valid).toBe(true);
      expect(result.value).toBe(10);
    });

    test('debe rechazar duraciones negativas', () => {
      const result = validateDuration(-5);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('entre 0 y 365');
    });

    test('debe rechazar duraciones muy grandes', () => {
      const result = validateDuration(500);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('entre 0 y 365');
    });

    test('debe rechazar valores no numéricos', () => {
      const result = validateDuration('abc');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateDate', () => {
    test('debe validar fechas correctas', () => {
      const result = validateDate('2025-01-15');
      expect(result.valid).toBe(true);
      expect(result.value).toBe('2025-01-15');
    });

    test('debe rechazar fechas vacías', () => {
      const result = validateDate('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('requerida');
    });

    test('debe rechazar fechas inválidas', () => {
      const result = validateDate('invalid-date');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('inválida');
    });

    test('debe rechazar fechas fuera de rango', () => {
      const result = validateDate('2050-01-01');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('fuera del rango');
    });
  });

  describe('sortTasksByWbsCode', () => {
    test('debe ordenar tareas por wbsCode numérico', () => {
      const tasks = [
        { wbsCode: 3, name: 'Tarea 3' },
        { wbsCode: 1, name: 'Tarea 1' },
        { wbsCode: 2, name: 'Tarea 2' }
      ];
      const sorted = sortTasksByWbsCode(tasks);
      expect(sorted[0].wbsCode).toBe(1);
      expect(sorted[1].wbsCode).toBe(2);
      expect(sorted[2].wbsCode).toBe(3);
    });

    test('debe ordenar tareas con wbsCode string', () => {
      const tasks = [
        { wbsCode: '3', name: 'Tarea 3' },
        { wbsCode: '1', name: 'Tarea 1' },
        { wbsCode: '2', name: 'Tarea 2' }
      ];
      const sorted = sortTasksByWbsCode(tasks);
      expect(sorted[0].wbsCode).toBe('1');
      expect(sorted[1].wbsCode).toBe('2');
      expect(sorted[2].wbsCode).toBe('3');
    });

    test('debe poner "Sin predecesoras" al final', () => {
      const tasks = [
        { wbsCode: 'Sin predecesoras', name: 'Sin deps' },
        { wbsCode: 1, name: 'Tarea 1' },
        { wbsCode: 2, name: 'Tarea 2' }
      ];
      const sorted = sortTasksByWbsCode(tasks);
      expect(sorted[2].wbsCode).toBe('Sin predecesoras');
    });
  });
});
