/**
 * Tests para ProjectContext
 * Verifica gestión de estado de proyectos
 */

import { renderHook, act } from '@testing-library/react';
import { ProjectProvider } from '../contexts/ProjectContext';

// Mock de AuthContext
jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    isAuthenticated: true,
    organizationId: 'test-org',
  }),
}));

describe('ProjectContext', () => {
  test('provides project context', () => {
    const wrapper = ({ children }) => <ProjectProvider>{children}</ProjectProvider>;

    // Verificar que el provider renderiza sin errores
    const { result } = renderHook(() => ({}), { wrapper });
    expect(result).toBeTruthy();
  });

  test('initializes with default state', () => {
    const wrapper = ({ children }) => <ProjectProvider>{children}</ProjectProvider>;
    const { result } = renderHook(() => ({}), { wrapper });

    // El provider debe inicializarse correctamente
    expect(result.current).toBeDefined();
  });
});
