/**
 * Tests para useAuthUser hook
 * Hook base de autenticación que centraliza lógica de usuario actual
 */

import { renderHook, waitFor } from '@testing-library/react';
import useAuthUser from '../hooks/useAuthUser';
import supabaseService from '../services/SupabaseService';

// Mock de SupabaseService
jest.mock('../services/SupabaseService');

describe('useAuthUser', () => {
  beforeEach(() => {
    // Limpiar mocks antes de cada test
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();

    // Mock básico de supabase.auth.onAuthStateChange
    supabaseService.supabase = {
      auth: {
        onAuthStateChange: jest.fn().mockReturnValue({
          data: {
            subscription: {
              unsubscribe: jest.fn()
            }
          }
        })
      },
      from: jest.fn()
    };
  });

  describe('Inicialización', () => {
    test('debe inicializar con valores por defecto', () => {
      // Mock: no hay usuario
      supabaseService.getCurrentUser.mockReturnValue(null);
      supabaseService.getCurrentOrganization.mockReturnValue(null);

      const { result } = renderHook(() => useAuthUser());

      expect(result.current.currentUser).toBeNull();
      expect(result.current.organizationId).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.userEmail).toBeNull();
      expect(result.current.userId).toBeNull();
    });

    test('debe cargar usuario autenticado correctamente', async () => {
      // Mock: usuario autenticado
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { name: 'Test User' }
      };

      supabaseService.getCurrentUser.mockReturnValue(mockUser);
      supabaseService.getCurrentOrganization.mockReturnValue('org-456');

      const { result } = renderHook(() => useAuthUser());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentUser).toEqual(mockUser);
      expect(result.current.organizationId).toBe('org-456');
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.userEmail).toBe('test@example.com');
      expect(result.current.userId).toBe('user-123');
    });
  });

  describe('Estado de loading', () => {
    test('debe cambiar isLoading a false después de cargar', async () => {
      supabaseService.getCurrentUser.mockReturnValue(null);
      supabaseService.getCurrentOrganization.mockReturnValue(null);

      const { result } = renderHook(() => useAuthUser());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('Validación de email', () => {
    test('debe manejar usuario sin email correctamente', async () => {
      // Usuario sin email (caso edge)
      const mockUser = {
        id: 'user-123',
        email: null
      };

      supabaseService.getCurrentUser.mockReturnValue(mockUser);

      const { result } = renderHook(() => useAuthUser());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.userEmail).toBeNull();
    });

    test('debe manejar usuario con email vacío correctamente', async () => {
      // Usuario con email vacío
      const mockUser = {
        id: 'user-123',
        email: ''
      };

      supabaseService.getCurrentUser.mockReturnValue(mockUser);

      const { result } = renderHook(() => useAuthUser());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Detección de organización', () => {
    test('debe manejar usuario sin organización', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com'
      };

      supabaseService.getCurrentUser.mockReturnValue(mockUser);
      supabaseService.getCurrentOrganization.mockReturnValue(null);

      // Mock para verificación de membresías
      supabaseService.supabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [{ id: 'membership-1', organization_id: 'org-456' }],
              error: null
            })
          })
        })
      });

      const { result } = renderHook(() => useAuthUser());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.organizationId).toBeNull();
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('Función reloadUser', () => {
    test('debe existir la función reloadUser', async () => {
      supabaseService.getCurrentUser.mockReturnValue(null);
      supabaseService.getCurrentOrganization.mockReturnValue(null);

      const { result } = renderHook(() => useAuthUser());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.reloadUser).toBe('function');
    });

    test('debe recargar datos del usuario al llamar reloadUser', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com'
      };

      supabaseService.getCurrentUser.mockReturnValue(mockUser);
      supabaseService.getCurrentOrganization.mockReturnValue('org-456');

      const { result } = renderHook(() => useAuthUser());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Llamar reloadUser
      result.current.reloadUser();

      expect(result.current.currentUser).toEqual(mockUser);
      expect(result.current.organizationId).toBe('org-456');
    });
  });

  describe('Helpers de usuario', () => {
    test('userEmail debe retornar el email del usuario', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com'
      };

      supabaseService.getCurrentUser.mockReturnValue(mockUser);
      supabaseService.getCurrentOrganization.mockReturnValue('org-456');

      const { result } = renderHook(() => useAuthUser());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.userEmail).toBe('test@example.com');
    });

    test('userId debe retornar el id del usuario', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com'
      };

      supabaseService.getCurrentUser.mockReturnValue(mockUser);
      supabaseService.getCurrentOrganization.mockReturnValue('org-456');

      const { result } = renderHook(() => useAuthUser());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.userId).toBe('user-123');
    });

    test('userEmail debe ser null si no hay usuario', async () => {
      supabaseService.getCurrentUser.mockReturnValue(null);
      supabaseService.getCurrentOrganization.mockReturnValue(null);

      const { result } = renderHook(() => useAuthUser());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.userEmail).toBeNull();
      expect(result.current.userId).toBeNull();
    });
  });
});
