/**
 * Tests para ScheduleManagement
 * Verifica que el módulo se importa correctamente
 */

import ScheduleManagement from '../components/ScheduleManagement';

describe('ScheduleManagement - Smoke Tests', () => {
  test('module imports without errors', () => {
    // Verificar que el módulo se puede importar
    expect(ScheduleManagement).toBeDefined();
    expect(typeof ScheduleManagement).toBe('function');
  });

  test('is a valid React component', () => {
    // Verificar que es un componente de React válido
    expect(ScheduleManagement.name).toBe('ScheduleManagement');
  });
});
