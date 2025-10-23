/**
 * Tests para TasksContext
 * Verifica la gestión de estado de tareas, minutas y riesgos
 */

import { renderHook, act } from '@testing-library/react';
import { TasksProvider, useTasks } from '../contexts/TasksContext';
import { ProjectsProvider } from '../contexts/ProjectsContext';

// Wrapper que incluye ambos providers necesarios
const AllProviders = ({ children }) => (
  <ProjectsProvider>
    <TasksProvider>
      {children}
    </TasksProvider>
  </ProjectsProvider>
);

describe('TasksContext', () => {
  const mockTask = {
    id: 'task-1',
    name: 'Tarea de prueba',
    duration: 5,
    progress: 50
  };

  const mockMinuta = {
    id: 'min-1',
    fecha: '2025-01-01',
    titulo: 'Minuta de prueba'
  };

  const mockRisk = {
    id: 'risk-1',
    name: 'Riesgo de prueba',
    probability: 0.5,
    impact: 0.8
  };

  beforeEach(() => {
    localStorage.clear();
  });

  test('initializes with empty task data', () => {
    const { result } = renderHook(() => useTasks(), { wrapper: AllProviders });

    expect(result.current.tasksByProject).toEqual({});
    expect(result.current.minutasByProject).toEqual({});
    expect(result.current.risksByProject).toEqual({});
    expect(result.current.includeWeekendsByProject).toEqual({});
    expect(result.current.auditLogsByProject).toEqual({});
  });

  test('throws error when used outside provider', () => {
    const consoleError = console.error;
    console.error = jest.fn();

    expect(() => {
      renderHook(() => useTasks());
    }).toThrow('useTasks debe usarse dentro de TasksProvider');

    console.error = consoleError;
  });

  test('setTasksByProject updates state', () => {
    const { result } = renderHook(() => useTasks(), { wrapper: AllProviders });

    const newData = { 'proj-1': [mockTask] };

    act(() => {
      result.current.setTasksByProject(newData);
    });

    expect(result.current.tasksByProject).toEqual(newData);
  });

  test('safeSetTasksByProject validates and cleans data', () => {
    const { result } = renderHook(() => useTasks(), { wrapper: AllProviders });

    // Datos corruptos: un proyecto tiene función en lugar de array
    const corruptedData = {
      'proj-1': [mockTask],
      'proj-2': 'invalid', // Corrupto
    };

    const consoleWarn = console.warn;
    console.warn = jest.fn();

    act(() => {
      result.current.safeSetTasksByProject(corruptedData);
    });

    // Debe limpiar los datos corruptos
    expect(result.current.tasksByProject['proj-1']).toEqual([mockTask]);
    expect(result.current.tasksByProject['proj-2']).toEqual([]); // Limpiado
    expect(console.warn).toHaveBeenCalled();

    console.warn = consoleWarn;
  });

  test('setMinutasByProject updates state', () => {
    const { result } = renderHook(() => useTasks(), { wrapper: AllProviders });

    const newData = { 'proj-1': [mockMinuta] };

    act(() => {
      result.current.setMinutasByProject(newData);
    });

    expect(result.current.minutasByProject).toEqual(newData);
  });

  test('setRisksByProject updates state', () => {
    const { result } = renderHook(() => useTasks(), { wrapper: AllProviders });

    const newData = { 'proj-1': [mockRisk] };

    act(() => {
      result.current.setRisksByProject(newData);
    });

    expect(result.current.risksByProject).toEqual(newData);
  });

  test('getCurrentProjectTasks returns empty array when no project', () => {
    const { result } = renderHook(() => useTasks(), { wrapper: AllProviders });

    const tasks = result.current.getCurrentProjectTasks();

    expect(tasks).toEqual([]);
  });

  test('getCurrentProjectTasks handles corrupted data', () => {
    const { result } = renderHook(() => useTasks(), { wrapper: AllProviders });

    const consoleWarn = console.warn;
    console.warn = jest.fn();

    // Forzar datos corruptos directamente (bypassando validación)
    act(() => {
      result.current.setTasksByProject({ 'proj-1': 'corrupt' });
    });

    const tasks = result.current.getCurrentProjectTasks();

    // Debe retornar array vacío con datos corruptos
    expect(Array.isArray(tasks)).toBe(true);

    console.warn = consoleWarn;
  });

  test('provides all helper functions', () => {
    const { result } = renderHook(() => useTasks(), { wrapper: AllProviders });

    expect(typeof result.current.getCurrentProjectTasks).toBe('function');
    expect(typeof result.current.getCurrentProjectMinutas).toBe('function');
    expect(typeof result.current.getCurrentProjectRisks).toBe('function');
    expect(typeof result.current.getCurrentProjectIncludeWeekends).toBe('function');
    expect(typeof result.current.getCurrentProjectAuditLogs).toBe('function');
    expect(typeof result.current.updateCurrentProjectTasks).toBe('function');
    expect(typeof result.current.updateCurrentProjectMinutas).toBe('function');
    expect(typeof result.current.updateCurrentProjectRisks).toBe('function');
    expect(typeof result.current.importTasksToCurrentProject).toBe('function');
  });
});
