/**
 * Tests para statusHelpers - Utilidades para manejo de estados
 */

import {
  getIndicatorColor,
  getStatusIcon,
  getStatusLabel,
  getStatusBadgeClasses
} from '../utils/statusHelpers';

describe('statusHelpers', () => {
  describe('getIndicatorColor', () => {
    describe('Para CPI (Cost Performance Index)', () => {
      test('debe retornar verde para CPI >= 1', () => {
        expect(getIndicatorColor(1.0, 'cpi')).toBe('text-green-600');
        expect(getIndicatorColor(1.5, 'cpi')).toBe('text-green-600');
        expect(getIndicatorColor(2.0, 'cpi')).toBe('text-green-600');
      });

      test('debe retornar amarillo para CPI entre 0.9 y 1', () => {
        expect(getIndicatorColor(0.9, 'cpi')).toBe('text-yellow-600');
        expect(getIndicatorColor(0.95, 'cpi')).toBe('text-yellow-600');
        expect(getIndicatorColor(0.99, 'cpi')).toBe('text-yellow-600');
      });

      test('debe retornar rojo para CPI < 0.9', () => {
        expect(getIndicatorColor(0.8, 'cpi')).toBe('text-red-600');
        expect(getIndicatorColor(0.5, 'cpi')).toBe('text-red-600');
        expect(getIndicatorColor(0.1, 'cpi')).toBe('text-red-600');
      });
    });

    describe('Para SPI (Schedule Performance Index)', () => {
      test('debe retornar verde para SPI >= 1', () => {
        expect(getIndicatorColor(1.0, 'spi')).toBe('text-green-600');
        expect(getIndicatorColor(1.2, 'spi')).toBe('text-green-600');
      });

      test('debe retornar amarillo para SPI entre 0.9 y 1', () => {
        expect(getIndicatorColor(0.9, 'spi')).toBe('text-yellow-600');
        expect(getIndicatorColor(0.95, 'spi')).toBe('text-yellow-600');
      });

      test('debe retornar rojo para SPI < 0.9', () => {
        expect(getIndicatorColor(0.8, 'spi')).toBe('text-red-600');
        expect(getIndicatorColor(0.7, 'spi')).toBe('text-red-600');
      });
    });

    describe('Para Variance (Variación)', () => {
      test('debe retornar verde para variación positiva o cero', () => {
        expect(getIndicatorColor(0, 'variance')).toBe('text-green-600');
        expect(getIndicatorColor(100, 'variance')).toBe('text-green-600');
        expect(getIndicatorColor(1000, 'variance')).toBe('text-green-600');
      });

      test('debe retornar rojo para variación negativa', () => {
        expect(getIndicatorColor(-1, 'variance')).toBe('text-red-600');
        expect(getIndicatorColor(-100, 'variance')).toBe('text-red-600');
        expect(getIndicatorColor(-1000, 'variance')).toBe('text-red-600');
      });
    });

    describe('Para tipos desconocidos', () => {
      test('debe retornar gris para tipos no reconocidos', () => {
        expect(getIndicatorColor(1, 'unknown')).toBe('text-gray-600');
        expect(getIndicatorColor(0.5, 'invalid')).toBe('text-gray-600');
        expect(getIndicatorColor(100, null)).toBe('text-gray-600');
      });
    });
  });

  describe('getStatusIcon', () => {
    test('debe retornar icono correcto para "active"', () => {
      expect(getStatusIcon('active')).toBe('🔄');
    });

    test('debe retornar icono correcto para "completed"', () => {
      expect(getStatusIcon('completed')).toBe('✅');
    });

    test('debe retornar icono correcto para "on-hold"', () => {
      expect(getStatusIcon('on-hold')).toBe('⏸️');
    });

    test('debe retornar icono correcto para "cancelled"', () => {
      expect(getStatusIcon('cancelled')).toBe('❌');
    });

    test('debe retornar icono por defecto para estados desconocidos', () => {
      expect(getStatusIcon('unknown')).toBe('⏸️');
      expect(getStatusIcon('pending')).toBe('⏸️');
      expect(getStatusIcon(null)).toBe('⏸️');
      expect(getStatusIcon(undefined)).toBe('⏸️');
    });
  });

  describe('getStatusLabel', () => {
    test('debe retornar etiqueta correcta para "active"', () => {
      expect(getStatusLabel('active')).toBe('Activo');
    });

    test('debe retornar etiqueta correcta para "completed"', () => {
      expect(getStatusLabel('completed')).toBe('Completado');
    });

    test('debe retornar etiqueta correcta para "on-hold"', () => {
      expect(getStatusLabel('on-hold')).toBe('En Pausa');
    });

    test('debe retornar etiqueta correcta para "cancelled"', () => {
      expect(getStatusLabel('cancelled')).toBe('Cancelado');
    });

    test('debe retornar el mismo valor para estados desconocidos', () => {
      expect(getStatusLabel('custom-status')).toBe('custom-status');
      expect(getStatusLabel('pending')).toBe('pending');
      expect(getStatusLabel('unknown')).toBe('unknown');
    });
  });

  describe('getStatusBadgeClasses', () => {
    test('debe retornar clases correctas para "active"', () => {
      const classes = getStatusBadgeClasses('active');
      expect(classes).toContain('bg-green-100');
      expect(classes).toContain('text-green-800');
      expect(classes).toContain('px-2');
      expect(classes).toContain('py-1');
      expect(classes).toContain('rounded-full');
    });

    test('debe retornar clases correctas para "completed"', () => {
      const classes = getStatusBadgeClasses('completed');
      expect(classes).toContain('bg-blue-100');
      expect(classes).toContain('text-blue-800');
    });

    test('debe retornar clases correctas para "on-hold"', () => {
      const classes = getStatusBadgeClasses('on-hold');
      expect(classes).toContain('bg-yellow-100');
      expect(classes).toContain('text-yellow-800');
    });

    test('debe retornar clases por defecto para estados desconocidos', () => {
      const classes = getStatusBadgeClasses('unknown');
      expect(classes).toContain('bg-gray-100');
      expect(classes).toContain('text-gray-800');
    });

    test('debe incluir clases base en todos los estados', () => {
      const statuses = ['active', 'completed', 'on-hold', 'cancelled', 'unknown'];

      statuses.forEach(status => {
        const classes = getStatusBadgeClasses(status);
        expect(classes).toContain('px-2');
        expect(classes).toContain('py-1');
        expect(classes).toContain('rounded-full');
        expect(classes).toContain('text-xs');
        expect(classes).toContain('font-medium');
      });
    });
  });
});
