/**
 * @jest-environment jsdom
 */
import {
  toISO,
  isWorkingDay,
  adjustToWorkingDay,
  findFirstWorkingDay,
  addWorkingDays,
  addDays,
  diffDaysExclusive,
  clamp01,
  parseExcelDate
} from '../utils/scheduleDateUtils';

describe('scheduleDateUtils', () => {
  describe('toISO', () => {
    test('debe convertir Date a formato ISO', () => {
      const date = new Date('2025-01-15');
      const result = toISO(date);
      expect(result).toBe('2025-01-15');
    });

    test('debe retornar fecha actual si no hay input', () => {
      const result = toISO();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('debe manejar fechas inválidas', () => {
      const result = toISO('invalid');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('isWorkingDay', () => {
    test('debe identificar lunes como día laboral', () => {
      // 2025-01-13 es lunes
      expect(isWorkingDay('2025-01-13')).toBe(true);
    });

    test('debe identificar viernes como día laboral', () => {
      // 2025-01-17 es viernes
      expect(isWorkingDay('2025-01-17')).toBe(true);
    });

    test('debe identificar sábado como no laboral', () => {
      // 2025-01-18 es sábado
      expect(isWorkingDay('2025-01-18')).toBe(false);
    });

    test('debe identificar domingo como no laboral', () => {
      // 2025-01-19 es domingo
      expect(isWorkingDay('2025-01-19')).toBe(false);
    });
  });

  describe('adjustToWorkingDay', () => {
    test('debe mantener día laboral', () => {
      // 2025-01-13 es lunes
      const result = adjustToWorkingDay('2025-01-13');
      expect(toISO(result)).toBe('2025-01-13');
    });

    test('debe ajustar sábado al siguiente lunes', () => {
      // 2025-01-18 es sábado -> ajustar a lunes 20
      const result = adjustToWorkingDay('2025-01-18');
      expect(toISO(result)).toBe('2025-01-20');
    });

    test('debe ajustar domingo al siguiente lunes', () => {
      // 2025-01-19 es domingo -> ajustar a lunes 20
      const result = adjustToWorkingDay('2025-01-19');
      expect(toISO(result)).toBe('2025-01-20');
    });
  });

  describe('addWorkingDays', () => {
    test('debe añadir 0 días y retornar la misma fecha', () => {
      const result = addWorkingDays('2025-01-13', 0);
      expect(result).toBe('2025-01-13');
    });

    test('debe añadir 1 día laboral', () => {
      // Lunes 13 + 1 día laboral = Lunes 13 (mismo día porque incluye día de inicio)
      const result = addWorkingDays('2025-01-13', 1);
      expect(result).toBe('2025-01-13');
    });

    test('debe añadir 5 días laborales (lunes a viernes)', () => {
      // Lunes 13 + 5 días laborales = Viernes 17
      const result = addWorkingDays('2025-01-13', 5);
      expect(result).toBe('2025-01-17');
    });

    test('debe saltar fines de semana', () => {
      // Viernes 17 + 3 días laborales = Martes 21 (saltando sábado y domingo)
      const result = addWorkingDays('2025-01-17', 3);
      expect(result).toBe('2025-01-21');
    });
  });

  describe('addDays', () => {
    test('con includeWeekends=true debe incluir fines de semana', () => {
      const result = addDays('2025-01-13', 5, true);
      expect(result).toBe('2025-01-18');
    });

    test('con includeWeekends=false debe excluir fines de semana', () => {
      const result = addDays('2025-01-13', 5, false);
      expect(result).toBe('2025-01-17');
    });
  });

  describe('clamp01', () => {
    test('debe limitar valores menores a 0', () => {
      expect(clamp01(-5)).toBe(0);
    });

    test('debe limitar valores mayores a 1', () => {
      expect(clamp01(5)).toBe(1);
    });

    test('debe mantener valores entre 0 y 1', () => {
      expect(clamp01(0.5)).toBe(0.5);
      expect(clamp01(0)).toBe(0);
      expect(clamp01(1)).toBe(1);
    });
  });

  describe('parseExcelDate', () => {
    test('debe parsear números seriales de Excel', () => {
      // 44562 = 2025-01-01 en Excel
      const result = parseExcelDate(44927);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('debe manejar valores vacíos', () => {
      const result = parseExcelDate(null);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('debe parsear fechas string', () => {
      const result = parseExcelDate('2025-01-15');
      expect(result).toBe('2025-01-15');
    });
  });
});
