/**
 * Tests para ProjectsContext
 * Verifica la gestión de estado de proyectos
 */

import { renderHook, act } from '@testing-library/react';
import { ProjectsProvider, useProjects } from '../contexts/ProjectsContext';

describe('ProjectsContext', () => {
  const mockProjects = [
    { id: 'proj-1', name: 'Proyecto 1', status: 'active' },
    { id: 'proj-2', name: 'Proyecto 2', status: 'active' },
    { id: 'proj-3', name: 'Proyecto 3', status: 'completed' },
  ];

  const wrapper = ({ children }) => (
    <ProjectsProvider>{children}</ProjectsProvider>
  );

  beforeEach(() => {
    localStorage.clear();
  });

  test('initializes with empty projects', () => {
    const { result } = renderHook(() => useProjects(), { wrapper });

    expect(result.current.projects).toEqual([]);
    expect(result.current.currentProjectId).toBeNull();
  });

  test('throws error when used outside provider', () => {
    // Suprimir console.error para este test
    const consoleError = console.error;
    console.error = jest.fn();

    expect(() => {
      renderHook(() => useProjects());
    }).toThrow('useProjects debe usarse dentro de ProjectsProvider');

    console.error = consoleError;
  });

  test('setProjects updates projects list', () => {
    const { result } = renderHook(() => useProjects(), { wrapper });

    act(() => {
      result.current.setProjects(mockProjects);
    });

    expect(result.current.projects).toEqual(mockProjects);
  });

  test('addProject adds a new project', () => {
    const { result } = renderHook(() => useProjects(), { wrapper });

    act(() => {
      result.current.setProjects(mockProjects);
    });

    const newProject = { id: 'proj-4', name: 'Proyecto 4', status: 'active' };

    act(() => {
      result.current.addProject(newProject);
    });

    expect(result.current.projects).toHaveLength(4);
    expect(result.current.projects[3]).toEqual(newProject);
  });

  test('updateProject updates an existing project', () => {
    const { result } = renderHook(() => useProjects(), { wrapper });

    act(() => {
      result.current.setProjects(mockProjects);
    });

    act(() => {
      result.current.updateProject('proj-1', { name: 'Proyecto 1 Actualizado' });
    });

    expect(result.current.projects[0].name).toBe('Proyecto 1 Actualizado');
  });

  test('removeProject removes a project', () => {
    const { result } = renderHook(() => useProjects(), { wrapper });

    act(() => {
      result.current.setProjects(mockProjects);
    });

    act(() => {
      result.current.removeProject('proj-2');
    });

    expect(result.current.projects).toHaveLength(2);
    expect(result.current.projects.find(p => p.id === 'proj-2')).toBeUndefined();
  });

  test('getActiveProjects returns only active projects', () => {
    const { result } = renderHook(() => useProjects(), { wrapper });

    act(() => {
      result.current.setProjects(mockProjects);
    });

    const activeProjects = result.current.getActiveProjects();

    expect(activeProjects).toHaveLength(2);
    expect(activeProjects.every(p => p.status === 'active')).toBe(true);
  });

  test('getCurrentProject returns the current project', () => {
    const { result } = renderHook(() => useProjects(), { wrapper });

    act(() => {
      result.current.setProjects(mockProjects);
    });

    act(() => {
      result.current.setCurrentProjectId('proj-2');
    });

    const currentProject = result.current.getCurrentProject();

    expect(currentProject).toEqual(mockProjects[1]);
  });

  test('getProjectsByStatus filters projects correctly', () => {
    const { result } = renderHook(() => useProjects(), { wrapper });

    act(() => {
      result.current.setProjects(mockProjects);
    });

    const completedProjects = result.current.getProjectsByStatus('completed');

    expect(completedProjects).toHaveLength(1);
    expect(completedProjects[0].id).toBe('proj-3');
  });

  test('automatically sets currentProjectId when projects are loaded', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useProjects(), { wrapper });

    act(() => {
      result.current.setProjects(mockProjects);
    });

    // Esperar a que los effects se ejecuten
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    // Debe seleccionar el primer proyecto activo
    expect(result.current.currentProjectId).toBeTruthy();
  });

  test('saves currentProjectId to localStorage', () => {
    const { result } = renderHook(() => useProjects(), { wrapper });

    act(() => {
      result.current.setCurrentProjectId('proj-1');
    });

    expect(localStorage.getItem('lastSelectedProjectId')).toBe('proj-1');
  });
});
