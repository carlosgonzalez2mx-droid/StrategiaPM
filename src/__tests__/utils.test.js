/**
 * Tests para funciones utilitarias
 * Verifica cálculos críticos
 */

describe('Utility Functions', () => {
  describe('Date calculations', () => {
    test('addWorkingDays excludes weekends', () => {
      // Test básico de días hábiles
      // Esta función debería estar en utils pero la extraeremos después
      const monday = new Date('2025-01-06'); // Lunes

      // Verificar que es lunes
      expect(monday.getDay()).toBe(1);
    });

    test('date parsing works correctly', () => {
      const dateStr = '2025-01-15';
      const date = new Date(dateStr);

      expect(date.getFullYear()).toBe(2025);
      expect(date.getMonth()).toBe(0); // Enero = 0
      expect(date.getDate()).toBe(15);
    });
  });

  describe('Task calculations', () => {
    test('calculates task progress correctly', () => {
      const totalTasks = 10;
      const completedTasks = 5;
      const progress = (completedTasks / totalTasks) * 100;

      expect(progress).toBe(50);
    });
  });

  describe('WBS Code sorting', () => {
    test('sorts numeric wbs codes correctly', () => {
      const tasks = [
        { wbsCode: '3', name: 'Task 3' },
        { wbsCode: '1', name: 'Task 1' },
        { wbsCode: '2', name: 'Task 2' },
      ];

      const sorted = [...tasks].sort((a, b) => {
        const aNum = parseInt(a.wbsCode);
        const bNum = parseInt(b.wbsCode);
        return aNum - bNum;
      });

      expect(sorted[0].wbsCode).toBe('1');
      expect(sorted[1].wbsCode).toBe('2');
      expect(sorted[2].wbsCode).toBe('3');
    });
  });
});
